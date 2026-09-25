from html.parser import HTMLParser
from pathlib import Path
import re
import subprocess
import unittest


ROOT = Path(__file__).resolve().parents[2]

TARGET_CSS_PATHS = [
    ROOT / "Harmonia" / "css" / "settings.css",
    ROOT / "HarmoniaApp" / "网页源码" / "css" / "settings.css",
    ROOT / "HarmoniaApp" / "源码" / "desktop" / "web" / "css" / "settings.css",
    ROOT / "HarmoniaApp" / "源码" / "mobile" / "www" / "css" / "settings.css",
    ROOT / "HarmoniaApp" / "源码" / "mobile" / "android" / "app" / "src" / "main" / "assets" / "public" / "css" / "settings.css",
    ROOT / "HarmoniaApp" / "源码" / "mobile" / "ios" / "App" / "App" / "public" / "css" / "settings.css",
]

ANDROID_BUILD_CSS_PATHS = [
    ROOT / "HarmoniaApp" / "源码" / "mobile" / "android" / "app" / "build" / "intermediates" / "assets" / "debug" / "mergeDebugAssets" / "public" / "css" / "settings.css",
    ROOT / "HarmoniaApp" / "源码" / "mobile" / "android" / "app" / "build" / "intermediates" / "assets" / "release" / "mergeReleaseAssets" / "public" / "css" / "settings.css",
]

HTML_PATHS = [
    ROOT / "Harmonia" / "main.html",
    ROOT / "HarmoniaApp" / "网页源码" / "main.html",
    ROOT / "HarmoniaApp" / "源码" / "desktop" / "web" / "main.html",
    ROOT / "HarmoniaApp" / "源码" / "mobile" / "www" / "main.html",
]

SWITCH_SELECTORS = (
    ".switch",
    ".switch input",
    ".slider",
    ".slider:before",
    ".switch:active .slider",
    ".switch:active .slider:before",
    "input:checked+.slider",
    "input:checked+.slider:before",
    ".switch:active input:checked+.slider:before",
    "input:focus-visible+.slider",
    "body.light-theme .slider",
    "body.light-theme input:checked+.slider",
)


def extract_css(css_text):
    css_text = re.sub(r"/\*.*?\*/", "", css_text, flags=re.DOTALL)
    rules = {}
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', css_text):
        selector = m.group(1).strip()
        body = m.group(2).strip()
        rules[selector] = body
    media_queries = re.findall(
        r'@media\s*\([^)]*\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}',
        css_text,
        re.DOTALL,
    )
    return rules, media_queries


class TargetPathTests(unittest.TestCase):
    def test_six_target_css_exist(self):
        for css_path in TARGET_CSS_PATHS:
            self.assertTrue(css_path.exists(), f"Missing target CSS: {css_path}")

    def test_android_build_paths_excluded_from_targets(self):
        for build_path in ANDROID_BUILD_CSS_PATHS:
            self.assertNotIn(build_path, TARGET_CSS_PATHS, "Build path must not be in target list")


class SwitchSelectorConsistencyTests(unittest.TestCase):
    def test_required_selectors_exist_exactly_once_per_target(self):
        for css_path in TARGET_CSS_PATHS:
            css_text = re.sub(r"/\*.*?\*/", "", css_path.read_text(encoding="utf-8"), flags=re.DOTALL)
            rules, _ = extract_css(css_text)
            for selector in SWITCH_SELECTORS:
                count = sum(1 for s in rules if s == selector)
                self.assertEqual(
                    count,
                    1,
                    f"{css_path}: selector {selector} must appear exactly once, found {count}",
                )

    def test_switch_selectors_consistent_across_six_targets(self):
        expected_bodies = {}
        for css_path in TARGET_CSS_PATHS:
            self.assertTrue(css_path.exists(), f"Missing target CSS: {css_path}")
            css_text = css_path.read_text(encoding="utf-8")
            css_no_comments = re.sub(r"/\*.*?\*/", "", css_text, flags=re.DOTALL)
            rules, _ = extract_css(css_no_comments)
            for selector in SWITCH_SELECTORS:
                self.assertIn(selector, rules, f"Missing selector {selector} in {css_path}")
                body = rules[selector]
                if selector not in expected_bodies:
                    expected_bodies[selector] = body
                else:
                    self.assertEqual(
                        expected_bodies[selector],
                        body,
                        f"Selector {selector} body mismatch in {css_path}",
                    )

    def test_media_queries_consistent_across_six_targets(self):
        expected = None
        for css_path in TARGET_CSS_PATHS:
            css_text = re.sub(r"/\*.*?\*/", "", css_path.read_text(encoding="utf-8"), flags=re.DOTALL)
            _, media_queries = extract_css(css_text)
            current = ";".join(media_queries)
            if expected is None:
                expected = current
            else:
                self.assertEqual(expected, current, f"Media query mismatch in {css_path}")

    def test_reduced_motion_per_file_exact_transitions_and_no_duplicates(self):
        for css_path in TARGET_CSS_PATHS:
            css_text = re.sub(r"/\*.*?\*/", "", css_path.read_text(encoding="utf-8"), flags=re.DOTALL)
            match = re.search(
                r'@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}',
                css_text,
                re.DOTALL | re.IGNORECASE,
            )
            self.assertIsNotNone(match, f"Missing reduced motion media query in {css_path}")
            block = match.group(1)
            rules, _ = extract_css(block)
            track_rules = [s for s in rules if s == ".slider"]
            thumb_rules = [s for s in rules if s == ".slider:before"]
            self.assertEqual(len(track_rules), 1, f"{css_path}: .slider must appear exactly once in reduced motion")
            self.assertEqual(len(thumb_rules), 1, f"{css_path}: .slider:before must appear exactly once in reduced motion")
            track_body = re.sub(r"\s+", "", rules[".slider"])
            thumb_body = re.sub(r"\s+", "", rules[".slider:before"])
            self.assertIn("transform1mslinear", track_body, f"{css_path}: .slider missing transform 1ms linear")
            self.assertIn("box-shadow1mslinear", track_body, f"{css_path}: .slider missing box-shadow 1ms linear")
            self.assertIn("background1mslinear", track_body, f"{css_path}: .slider missing background 1ms linear")
            self.assertIn("border-color1mslinear", track_body, f"{css_path}: .slider missing border-color 1ms linear")
            self.assertIn("transform1mslinear", thumb_body, f"{css_path}: .slider:before missing transform 1ms linear")
            self.assertIn("border-radius1mslinear", thumb_body, f"{css_path}: .slider:before missing border-radius 1ms linear")
            self.assertIn("box-shadow1mslinear", thumb_body, f"{css_path}: .slider:before missing box-shadow 1ms linear")

    def test_reduced_motion_exact_rules_and_no_global_duplicates(self):
        for css_path in TARGET_CSS_PATHS:
            css_text = re.sub(r"/\*.*?\*/", "", css_path.read_text(encoding="utf-8"), flags=re.DOTALL)
            # Extract the exact @media block
            match = re.search(
                r'@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}',
                css_text,
                re.DOTALL | re.IGNORECASE,
            )
            self.assertIsNotNone(match, f"Missing reduced motion media query in {css_path}")
            block = match.group(1)
            rules, _ = extract_css(block)
            # Exact rule/property matching for complete transition values
            expected_track = "transition:transform 1ms linear,box-shadow 1ms linear,background 1ms linear,border-color 1ms linear"
            expected_thumb = "transition:transform 1ms linear,border-radius 1ms linear,box-shadow 1ms linear"
            self.assertIn(".slider", rules, f"{css_path}: .slider missing in reduced motion")
            self.assertIn(".slider:before", rules, f"{css_path}: .slider:before missing in reduced motion")
            self.assertEqual(rules[".slider"], expected_track, f"{css_path}: .slider reduced motion transition mismatch")
            self.assertEqual(rules[".slider:before"], expected_thumb, f"{css_path}: .slider:before reduced motion transition mismatch")
            # Assert these exact rules are absent from global top-level rules.
            # extract_css merges media-query rules, so verify via raw text: the first
            # occurrence of each selector must be the normal transition declaration.
            first_slider = re.search(r'\.slider\s*\{([^{}]*)\}', css_text)
            self.assertIsNotNone(first_slider, f"{css_path}: .slider missing globally")
            self.assertNotIn("1ms linear", first_slider.group(1), f"{css_path}: global .slider must not contain reduced-motion 1ms linear")
            first_thumb = re.search(r'\.slider:before\s*\{([^{}]*)\}', css_text)
            self.assertIsNotNone(first_thumb, f"{css_path}: .slider:before missing globally")
            self.assertNotIn("1ms linear", first_thumb.group(1), f"{css_path}: global .slider:before must not contain reduced-motion 1ms linear")


class SwitchCssContractTests(unittest.TestCase):
    def _find_rule(self, css_text, selector):
        # css_text passed here may already be whitespace-stripped by callers;
        # normalize selector the same way so compound selectors like
        # `.switch input` or `input:checked+.slider` still match.
        normalized_selector = re.sub(r"\s+", "", selector)
        pattern = re.compile(r'(^|})\s*' + re.escape(normalized_selector) + r'\s*\{', re.DOTALL)
        match = pattern.search(css_text)
        return match

    def _rule_body(self, css_text, selector):
        match = self._find_rule(css_text, selector)
        self.assertIsNotNone(match, f"Missing CSS selector: {selector}")
        start = match.end()
        depth = 1
        i = start
        while i < len(css_text) and depth > 0:
            if css_text[i] == '{':
                depth += 1
            elif css_text[i] == '}':
                depth -= 1
            i += 1
        return css_text[start : i - 1] if depth == 0 else None

    def _assert_property(self, css_text, selector, property_name, expected_value, msg=None):
        body = self._rule_body(css_text, selector)
        normalized = re.sub(r"\s+", "", body)
        # Normalize the expected value the same way so compressed CSS like
        # `border:1px solid ...` still matches after whitespace stripping.
        normalized_expected = re.sub(r"\s+", "", expected_value)
        pattern = re.compile(
            r'(?:^|;)' + re.escape(property_name) + r':' + re.escape(normalized_expected) + r'(?=;|$)',
            re.IGNORECASE,
        )
        self.assertTrue(
            pattern.search(normalized),
            msg or f"{selector} missing {property_name}: {expected_value}; got={normalized!r}",
        )

    def test_switch_dimensions_per_file(self):
        for css_path in TARGET_CSS_PATHS:
            css_text = re.sub(r"/\*.*?\*/", "", css_path.read_text(encoding="utf-8"), flags=re.DOTALL)
            css_text = re.sub(r"\s+", "", css_text)
            self._assert_property(css_text, ".switch", "width", "56px", f"{css_path}: .switch width mismatch")
            self._assert_property(css_text, ".switch", "height", "30px", f"{css_path}: .switch height mismatch")
            self._assert_property(css_text, ".switch", "margin-right", "15px", f"{css_path}: .switch margin-right mismatch")

    def test_switch_input_visually_hidden_per_file(self):
        for css_path in TARGET_CSS_PATHS:
            css_text = re.sub(r"/\*.*?\*/", "", css_path.read_text(encoding="utf-8"), flags=re.DOTALL)
            css_text = re.sub(r"\s+", "", css_text)
            self._assert_property(css_text, ".switch input", "position", "absolute", f"{css_path}: input position mismatch")
            self._assert_property(css_text, ".switch input", "width", "1px", f"{css_path}: input width mismatch")
            self._assert_property(css_text, ".switch input", "height", "1px", f"{css_path}: input height mismatch")
            self._assert_property(css_text, ".switch input", "overflow", "hidden", f"{css_path}: input overflow mismatch")
            self._assert_property(css_text, ".switch input", "clip", "rect(0 0 0 0)", f"{css_path}: input clip mismatch")
            self._assert_property(css_text, ".switch input", "clip-path", "inset(50%)", f"{css_path}: input clip-path mismatch")
            self._assert_property(css_text, ".switch input", "white-space", "nowrap", f"{css_path}: input white-space mismatch")
            self._assert_property(css_text, ".switch input", "border", "0", f"{css_path}: input border mismatch")
            self._assert_property(css_text, ".switch input", "opacity", "0", f"{css_path}: input opacity mismatch")

    def test_slider_dimensions_and_positioning_per_file(self):
        for css_path in TARGET_CSS_PATHS:
            css_text = re.sub(r"/\*.*?\*/", "", css_path.read_text(encoding="utf-8"), flags=re.DOTALL)
            css_text = re.sub(r"\s+", "", css_text)
            self._assert_property(css_text, ".slider", "position", "absolute", f"{css_path}: slider position mismatch")
            self._assert_property(css_text, ".slider", "cursor", "pointer", f"{css_path}: slider cursor mismatch")
            self._assert_property(css_text, ".slider", "inset", "0", f"{css_path}: slider inset mismatch")
            self._assert_property(css_text, ".slider", "background", "rgba(255,255,255,.12)", f"{css_path}: slider background mismatch")
            self._assert_property(css_text, ".slider", "border", "1px solid rgba(255,255,255,.15)", f"{css_path}: slider border mismatch")
            self._assert_property(css_text, ".slider", "border-radius", "var(--border-radius-full)", f"{css_path}: slider border-radius mismatch")
            self._assert_property(css_text, ".slider", "box-shadow", "inset 0 1px 2px rgba(0,0,0,.2)", f"{css_path}: slider box-shadow mismatch")
            self._assert_property(
                css_text,
                ".slider",
                "transition",
                "transform 120ms ease,box-shadow 240ms ease,background 210ms ease,border-color 210ms ease",
                f"{css_path}: slider transition mismatch",
            )
            self._assert_property(css_text, ".slider", "will-change", "transform,box-shadow,background", f"{css_path}: slider will-change mismatch")

    def test_slider_before_dimensions_and_positioning_per_file(self):
        for css_path in TARGET_CSS_PATHS:
            css_text = re.sub(r"/\*.*?\*/", "", css_path.read_text(encoding="utf-8"), flags=re.DOTALL)
            css_text = re.sub(r"\s+", "", css_text)
            self._assert_property(css_text, ".slider:before", "position", "absolute", f"{css_path}: thumb position mismatch")
            self._assert_property(css_text, ".slider:before", "content", '""', f"{css_path}: thumb content mismatch")
            self._assert_property(css_text, ".slider:before", "top", "4px", f"{css_path}: thumb top mismatch")
            self._assert_property(css_text, ".slider:before", "left", "4px", f"{css_path}: thumb left mismatch")
            self._assert_property(css_text, ".slider:before", "width", "22px", f"{css_path}: thumb width mismatch")
            self._assert_property(css_text, ".slider:before", "height", "22px", f"{css_path}: thumb height mismatch")
            self._assert_property(css_text, ".slider:before", "border-radius", "50%", f"{css_path}: thumb border-radius mismatch")
            self._assert_property(css_text, ".slider:before", "background", "linear-gradient(145deg,#fff,#f0f0f5)", f"{css_path}: thumb background mismatch")
            self._assert_property(css_text, ".slider:before", "box-shadow", "0 1px 4px rgba(0,0,0,.15)", f"{css_path}: thumb box-shadow mismatch")
            self._assert_property(
                css_text,
                ".slider:before",
                "transition",
                "transform 260ms cubic-bezier(.34,1.56,.64,1),border-radius 120ms ease,box-shadow 210ms ease",
                f"{css_path}: thumb transition mismatch",
            )
            self._assert_property(css_text, ".slider:before", "will-change", "transform,border-radius,box-shadow", f"{css_path}: thumb will-change mismatch")

    def test_active_track_and_thumb_per_file(self):
        for css_path in TARGET_CSS_PATHS:
            css_text = re.sub(r"/\*.*?\*/", "", css_path.read_text(encoding="utf-8"), flags=re.DOTALL)
            css_text = re.sub(r"\s+", "", css_text)
            self._assert_property(css_text, ".switch:active .slider", "transform", "scale(.965)", f"{css_path}: active track transform mismatch")
            self._assert_property(css_text, ".switch:active .slider:before", "transform", "scaleX(1.2)", f"{css_path}: active thumb transform mismatch")
            self._assert_property(css_text, ".switch:active .slider:before", "border-radius", "44% 56% 56% 44%", f"{css_path}: active thumb border-radius mismatch")

    def test_checked_active_thumb_per_file(self):
        for css_path in TARGET_CSS_PATHS:
            css_text = re.sub(r"/\*.*?\*/", "", css_path.read_text(encoding="utf-8"), flags=re.DOTALL)
            css_text = re.sub(r"\s+", "", css_text)
            self._assert_property(
                css_text,
                ".switch:active input:checked+.slider:before",
                "transform",
                "translateX(26px) scaleX(1.2)",
                f"{css_path}: checked active thumb transform mismatch",
            )
            self._assert_property(
                css_text,
                ".switch:active input:checked+.slider:before",
                "border-radius",
                "56% 44% 44% 56%",
                f"{css_path}: checked active thumb border-radius mismatch",
            )

    def test_checked_track_per_file(self):
        for css_path in TARGET_CSS_PATHS:
            css_text = re.sub(r"/\*.*?\*/", "", css_path.read_text(encoding="utf-8"), flags=re.DOTALL)
            css_text = re.sub(r"\s+", "", css_text)
            self._assert_property(css_text, "input:checked+.slider", "background", "linear-gradient(120deg,var(--success-color),#5ee681)", f"{css_path}: checked track background mismatch")
            self._assert_property(css_text, "input:checked+.slider", "border-color", "rgba(116,241,147,.66)", f"{css_path}: checked track border-color mismatch")
            self._assert_property(css_text, "input:checked+.slider", "box-shadow", "0 0 14px rgba(48,209,88,.24),inset 0 1px 0 rgba(255,255,255,.25)", f"{css_path}: checked track box-shadow mismatch")

    def test_checked_thumb_per_file(self):
        for css_path in TARGET_CSS_PATHS:
            css_text = re.sub(r"/\*.*?\*/", "", css_path.read_text(encoding="utf-8"), flags=re.DOTALL)
            css_text = re.sub(r"\s+", "", css_text)
            self._assert_property(css_text, "input:checked+.slider:before", "transform", "translateX(26px)", f"{css_path}: checked thumb transform mismatch")
            self._assert_property(css_text, "input:checked+.slider:before", "box-shadow", "0 3px 10px rgba(11,106,37,.28)", f"{css_path}: checked thumb box-shadow mismatch")

    def test_focus_visible_per_file(self):
        for css_path in TARGET_CSS_PATHS:
            css_text = re.sub(r"/\*.*?\*/", "", css_path.read_text(encoding="utf-8"), flags=re.DOTALL)
            css_text = re.sub(r"\s+", "", css_text)
            self._assert_property(css_text, "input:focus-visible+.slider", "outline", "3px solid var(--accent-color)", f"{css_path}: focus outline mismatch")
            self._assert_property(css_text, "input:focus-visible+.slider", "outline-offset", "3px", f"{css_path}: focus outline-offset mismatch")

    def test_light_theme_track_per_file(self):
        for css_path in TARGET_CSS_PATHS:
            css_text = re.sub(r"/\*.*?\*/", "", css_path.read_text(encoding="utf-8"), flags=re.DOTALL)
            css_text = re.sub(r"\s+", "", css_text)
            self._assert_property(css_text, "body.light-theme .slider", "background", "rgba(30,34,45,.12)", f"{css_path}: light track background mismatch")
            self._assert_property(css_text, "body.light-theme .slider", "border-color", "rgba(30,34,45,.12)", f"{css_path}: light track border-color mismatch")
            self._assert_property(css_text, "body.light-theme .slider", "box-shadow", "inset 0 1px 2px rgba(0,0,0,.05)", f"{css_path}: light track box-shadow mismatch")

    def test_light_theme_checked_track_per_file(self):
        for css_path in TARGET_CSS_PATHS:
            css_text = re.sub(r"/\*.*?\*/", "", css_path.read_text(encoding="utf-8"), flags=re.DOTALL)
            css_text = re.sub(r"\s+", "", css_text)
            self._assert_property(css_text, "body.light-theme input:checked+.slider", "background", "linear-gradient(120deg,var(--success-color),#5ee681)", f"{css_path}: light checked track background mismatch")
            self._assert_property(css_text, "body.light-theme input:checked+.slider", "border-color", "rgba(116,241,147,.66)", f"{css_path}: light checked track border-color mismatch")
            self._assert_property(css_text, "body.light-theme input:checked+.slider", "box-shadow", "0 0 14px rgba(48,209,88,.24),inset 0 1px 0 rgba(255,255,255,.25)", f"{css_path}: light checked track box-shadow mismatch")
            # Verify ordering: light-theme checked override appears after base light-theme track.
            # After whitespace stripping, selectors compress to no-space form.
            light_track_idx = css_text.find("body.light-theme.slider{")
            light_checked_idx = css_text.find("body.light-themeinput:checked+.slider{")
            self.assertNotEqual(light_track_idx, -1, f"{css_path}: missing body.light-theme .slider")
            self.assertNotEqual(light_checked_idx, -1, f"{css_path}: missing body.light-theme input:checked+.slider")
            self.assertLess(light_track_idx, light_checked_idx, f"{css_path}: checked override must appear after light-theme track")

    def test_reduced_motion_media_query_per_file(self):
        for css_path in TARGET_CSS_PATHS:
            css_text = re.sub(r"/\*.*?\*/", "", css_path.read_text(encoding="utf-8"), flags=re.DOTALL)
            match = re.search(
                r'@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}',
                css_text,
                re.DOTALL | re.IGNORECASE,
            )
            self.assertIsNotNone(match, f"Missing prefers-reduced-motion media query in {css_path}")
            body = match.group(1)
            track_match = re.search(r'\.slider\s*\{([^{}]*)\}', body)
            thumb_match = re.search(r'\.slider:before\s*\{([^{}]*)\}', body)
            self.assertIsNotNone(track_match, f"Missing .slider rule in reduced motion in {css_path}")
            self.assertIsNotNone(thumb_match, f"Missing .slider:before rule in reduced motion in {css_path}")
            track_text = re.sub(r"\s+", "", track_match.group(1))
            thumb_text = re.sub(r"\s+", "", thumb_match.group(1))
            self.assertIn("transform1mslinear", track_text, f"{css_path}: reduced motion .slider missing transform")
            self.assertIn("box-shadow1mslinear", track_text, f"{css_path}: reduced motion .slider missing box-shadow")
            self.assertIn("background1mslinear", track_text, f"{css_path}: reduced motion .slider missing background")
            self.assertIn("border-color1mslinear", track_text, f"{css_path}: reduced motion .slider missing border-color")
            self.assertIn("transform1mslinear", thumb_text, f"{css_path}: reduced motion .slider:before missing transform")
            self.assertIn("border-radius1mslinear", thumb_text, f"{css_path}: reduced motion .slider:before missing border-radius")
            self.assertIn("box-shadow1mslinear", thumb_text, f"{css_path}: reduced motion .slider:before missing box-shadow")

    def test_false_positive_wrong_selector_does_not_satisfy_property(self):
        css = ".switch:active .slider:before{transform:scaleX(1.2);border-radius:44% 56% 56% 44%}"
        with self.assertRaises(AssertionError):
            self._assert_property(css, ".switch:active .slider", "transform", "scale(.965)")
        with self.assertRaises(AssertionError):
            self._assert_property(css, ".switch:active .slider:before", "transform", "scale(.965)")


class SwitchDOMTests(unittest.TestCase):
    def _parse_switch_children_from_html(self, html):
        class SwitchParser(HTMLParser):
            def __init__(self):
                super().__init__()
                self.switch_children = []
                self._stack = []

            def handle_starttag(self, tag, attrs):
                attrs_dict = dict(attrs)
                if tag == "label" and "switch" in attrs_dict.get("class", ""):
                    self._stack.append([])
                elif self._stack:
                    self._stack[-1].append({"tag": tag, "attrs": attrs_dict})

            def handle_endtag(self, tag):
                if tag == "label" and self._stack:
                    self.switch_children.append(self._stack.pop())

        parser = SwitchParser()
        parser.feed(html)
        return parser.switch_children

    def _parse_switch_children(self, html_path):
        return self._parse_switch_children_from_html(html_path.read_text(encoding="utf-8"))

    def test_label_switch_children_are_input_and_slider(self):
        for html_path in HTML_PATHS:
            children_list = self._parse_switch_children(html_path)
            self.assertTrue(len(children_list) > 0, f"No label.switch found in {html_path}")
            for children in children_list:
                self.assertEqual(len(children), 2, f"label.switch must have exactly 2 children in {html_path}")
                self.assertEqual(children[0]["tag"], "input", f"First child must be input in {html_path}")
                self.assertEqual(children[0]["attrs"].get("type"), "checkbox", f"Input must be checkbox in {html_path}")
                self.assertEqual(children[1]["tag"], "span", f"Second child must be span in {html_path}")
                self.assertIn("slider", children[1]["attrs"].get("class", "").split(), f"Span must have slider class in {html_path}")

    def test_four_entry_checkbox_ids_non_empty_unique_and_consistent(self):
        id_lists = []
        for html_path in HTML_PATHS:
            children_list = self._parse_switch_children(html_path)
            ids = []
            for children in children_list:
                checkbox_id = children[0]["attrs"].get("id")
                self.assertIsNotNone(checkbox_id, f"Checkbox must have id in {html_path}")
                ids.append(checkbox_id)
            self.assertTrue(len(ids) > 0, f"No switch IDs found in {html_path}")
            self.assertEqual(len(ids), len(set(ids)), f"Duplicate switch IDs in {html_path}")
            id_lists.append(ids)
        first = id_lists[0]
        for ids in id_lists[1:]:
            self.assertEqual(first, ids, "Ordered switch ID lists must be consistent across four entries")

    def test_negative_parser_rejects_input_outside_switch(self):
        html = '<input type="checkbox" id="outside"><label class="switch"><input type="checkbox" id="inside"><span class="slider"></span></label>'
        children_list = self._parse_switch_children_from_html(html)
        self.assertEqual(len(children_list), 1)
        self.assertEqual(len(children_list[0]), 2)
        self.assertEqual(children_list[0][0]["attrs"].get("id"), "inside")

    def test_negative_parser_rejects_reversed_children(self):
        html = '<label class="switch"><span class="slider"></span><input type="checkbox" id="reversed"></label>'
        children_list = self._parse_switch_children_from_html(html)
        self.assertEqual(len(children_list), 1)
        self.assertEqual(len(children_list[0]), 2)
        self.assertEqual(children_list[0][0]["tag"], "span")
        self.assertEqual(children_list[0][1]["attrs"].get("id"), "reversed")


class GitStateTests(unittest.TestCase):
    def test_harmonia_is_inside_git_work_tree_and_main_html_tracked(self):
        # E:\DeepseekHarness is itself a git work tree; verify the repo is
        # present and that the migrated main.html is under version control.
        work_tree = subprocess.run(
            ["git", "rev-parse", "--is-inside-work-tree"],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        self.assertEqual(work_tree.returncode, 0, "E:\\DeepseekHarness must be inside a git work tree")
        self.assertIn("true", work_tree.stdout.strip(), "git rev-parse must report inside work tree")
        tracked = subprocess.run(
            ["git", "ls-files", "--error-unmatch", "Harmonia/main.html"],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        self.assertEqual(tracked.returncode, 0, "Harmonia/main.html must be tracked by git")


if __name__ == "__main__":
    unittest.main()
