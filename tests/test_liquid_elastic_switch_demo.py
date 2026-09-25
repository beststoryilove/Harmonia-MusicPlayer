from html.parser import HTMLParser
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "demos" / "liquid-elastic-switch" / "index.html"
CSS_PATH = ROOT / "demos" / "liquid-elastic-switch" / "demo.css"


class DemoParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.scripts = []
        self.checkbox_attrs = []
        self.classes = []
        self.switch_children = []
        self.theme_checkboxes = {"dark": [], "light": []}
        self._current_theme = None
        self._in_liquid_switch = False
        self._current_switch_children = None
        self.setting_rows = []
        self._setting_row_depth = 0
        self._current_setting_row_classes = None
        self.section_aria = []
        self.h2_ids = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "link":
            self.links.append(attributes.get("href"))
        if tag == "script":
            self.scripts.append(attributes.get("src"))

        if tag == "section":
            classes = attributes.get("class", "")
            if "demo-panel--dark" in classes:
                self._current_theme = "dark"
            elif "demo-panel--light" in classes:
                self._current_theme = "light"
            self.section_aria.append(attributes.get("aria-labelledby"))

        if tag == "h2":
            self.h2_ids.append(attributes.get("id"))

        if tag == "input" and attributes.get("type") == "checkbox":
            self.checkbox_attrs.append(attributes)
            if self._current_theme and "aria-label" in attributes:
                self.theme_checkboxes[self._current_theme].append(attributes)

        self.classes.extend(attributes.get("class", "").split())

        if self._in_liquid_switch:
            child_info = dict(attributes)
            child_info["tag"] = tag
            self._current_switch_children.append(child_info)

        if tag == "label" and "liquid-switch" in attributes.get("class", ""):
            self._in_liquid_switch = True
            self._current_switch_children = []
            self.switch_children.append(self._current_switch_children)

        if tag == "div" and "setting-row" in attributes.get("class", ""):
            self._setting_row_depth = 1
            self._current_setting_row_classes = attributes.get("class", "").split()
            self.setting_rows.append({
                "classes": self._current_setting_row_classes,
                "has_label": False,
                "has_desc": False,
                "has_switch": False,
                "label_tag": None,
                "desc_tag": None,
            })
        elif self._setting_row_depth > 0:
            if tag == "div":
                self._setting_row_depth += 1
            if tag == "div" and "setting-label" in attributes.get("class", ""):
                self.setting_rows[-1]["has_label"] = True
                self.setting_rows[-1]["label_tag"] = "div"
            if tag == "strong" and "setting-label" in attributes.get("class", ""):
                self.setting_rows[-1]["has_label"] = True
                self.setting_rows[-1]["label_tag"] = "strong"
            if tag == "div" and "setting-desc" in attributes.get("class", ""):
                self.setting_rows[-1]["has_desc"] = True
                self.setting_rows[-1]["desc_tag"] = "div"
            if tag == "small" and "setting-desc" in attributes.get("class", ""):
                self.setting_rows[-1]["has_desc"] = True
                self.setting_rows[-1]["desc_tag"] = "small"
            if tag == "label" and "liquid-switch" in attributes.get("class", ""):
                self.setting_rows[-1]["has_switch"] = True

    def handle_endtag(self, tag):
        if tag == "section":
            self._current_theme = None
        if tag == "label" and self._in_liquid_switch:
            self._in_liquid_switch = False
            self._current_switch_children = None
        if tag == "div" and self._setting_row_depth > 0:
            self._setting_row_depth -= 1
            if self._setting_row_depth == 0:
                self._current_setting_row_classes = None


class LiquidElasticSwitchDemoTests(unittest.TestCase):
    def parse_demo(self):
        parser = DemoParser()
        parser.feed(HTML_PATH.read_text(encoding="utf-8"))
        return parser

    def test_demo_references_only_project_variables_and_local_styles(self):
        parser = self.parse_demo()
        self.assertIn("../../css/variables.css", parser.links)
        self.assertIn("demo.css", parser.links)
        self.assertEqual(parser.scripts, [])

    def test_demo_contains_dark_and_light_panels(self):
        parser = self.parse_demo()
        self.assertIn("demo-panel--dark", parser.classes)
        self.assertIn("demo-panel--light", parser.classes)

    def test_demo_grid_wraps_panels(self):
        parser = self.parse_demo()
        self.assertEqual(parser.classes.count("demo-grid"), 1)

    def test_each_theme_has_two_setting_rows(self):
        parser = self.parse_demo()
        self.assertEqual(len(parser.setting_rows), 4)
        for row in parser.setting_rows:
            self.assertIn("setting-row", row["classes"])
            self.assertTrue(row["has_label"])
            self.assertTrue(row["has_desc"])
            self.assertTrue(row["has_switch"])

    def test_demo_contains_checked_and_unchecked_native_switches(self):
        parser = self.parse_demo()
        self.assertEqual(len(parser.checkbox_attrs), 4)
        self.assertEqual(sum("checked" in attrs for attrs in parser.checkbox_attrs), 2)
        self.assertTrue(all("aria-label" in attrs for attrs in parser.checkbox_attrs))
        self.assertEqual(parser.classes.count("liquid-switch"), 4)
        self.assertEqual(parser.classes.count("liquid-switch__track"), 4)
        self.assertEqual(parser.classes.count("liquid-switch__thumb"), 4)

    def _validate_switch_structure(self, children):
        self.assertEqual(len(children), 3)
        self.assertEqual(children[0]["tag"], "input")
        self.assertEqual(children[0].get("type"), "checkbox")
        self.assertEqual(children[1]["tag"], "span")
        self.assertIn("liquid-switch__track", children[1].get("class", ""))
        self.assertEqual(children[2]["tag"], "span")
        self.assertIn("liquid-switch__thumb", children[2].get("class", ""))

    def test_each_liquid_switch_has_correct_structure(self):
        parser = self.parse_demo()
        self.assertEqual(len(parser.switch_children), 4)
        for children in parser.switch_children:
            self._validate_switch_structure(children)

    def test_each_theme_has_correct_default_states(self):
        parser = self.parse_demo()
        for theme in ("dark", "light"):
            checkboxes = parser.theme_checkboxes[theme]
            self.assertEqual(len(checkboxes), 2, f"{theme} theme must have exactly 2 switches")
            self.assertEqual(checkboxes[0].get("aria-label"), f"{'深色' if theme == 'dark' else '浅色'}主题：启用逐字歌词")
            self.assertIn("checked", checkboxes[0])
            self.assertEqual(checkboxes[1].get("aria-label"), f"{'深色' if theme == 'dark' else '浅色'}主题：歌曲过渡动画")
            self.assertNotIn("checked", checkboxes[1])

    def test_sections_have_aria_labelledby_linked_to_unique_h2_ids(self):
        parser = self.parse_demo()
        self.assertEqual(len(parser.section_aria), 2)
        self.assertEqual(len(parser.h2_ids), 2)
        self.assertIsNotNone(parser.section_aria[0])
        self.assertIsNotNone(parser.section_aria[1])
        self.assertIn(parser.section_aria[0], parser.h2_ids)
        self.assertIn(parser.section_aria[1], parser.h2_ids)
        self.assertEqual(len(set(parser.h2_ids)), 2, "h2 ids must be unique")

    def test_liquid_switch_structure_rejects_inverted_children(self):
        inverted_html = '''
        <label class="liquid-switch">
            <span class="liquid-switch__thumb"></span>
            <span class="liquid-switch__track"></span>
            <input type="checkbox" aria-label="测试">
        </label>
        '''
        parser = DemoParser()
        parser.feed(inverted_html)
        self.assertEqual(len(parser.switch_children), 1)
        with self.assertRaises(AssertionError):
            self._validate_switch_structure(parser.switch_children[0])

    def test_setting_rows_use_semantic_strong_and_small(self):
        parser = self.parse_demo()
        self.assertEqual(len(parser.setting_rows), 4)
        for row in parser.setting_rows:
            self.assertEqual(row["label_tag"], "strong", "setting label must be <strong class=\"setting-label\">")
            self.assertEqual(row["desc_tag"], "small", "setting description must be <small class=\"setting-desc\">")


class LiquidElasticSwitchCssContractTests(unittest.TestCase):
    def _css(self):
        self.assertTrue(CSS_PATH.exists(), f"Missing CSS file: {CSS_PATH}")
        text = CSS_PATH.read_text(encoding="utf-8")
        return re.sub(r"\s*([:;,{}])\s*", r"\1", text)

    def _find_rule(self, css_text, selector):
        pattern = re.compile(r'(^|})\s*' + re.escape(selector) + r'\s*\{', re.DOTALL)
        match = pattern.search(css_text)
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
        body = self._find_rule(css_text, selector)
        pattern = re.compile(
            r'(?:^|;)\s*' + re.escape(property_name) + r'\s*:\s*' + re.escape(expected_value) + r'(?=;|$)',
            re.IGNORECASE,
        )
        self.assertTrue(
            pattern.search(body),
            msg
            or f"{selector} missing {property_name}: {expected_value}; body={body!r}",
        )

    def test_css_file_exists(self):
        self.assertTrue(CSS_PATH.exists(), f"Missing CSS file: {CSS_PATH}")

    def test_global_box_sizing_and_page_layout(self):
        css = self._css()
        self._assert_property(css, "*", "box-sizing", "border-box")
        self._assert_property(css, ".demo-page", "max-width", "900px")
        self._assert_property(css, ".demo-grid", "display", "grid")
        self._assert_property(css, ".demo-grid", "grid-template-columns", "repeat(2,1fr)")
        match = re.search(
            r'@media\s*\(max-width:760px\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}',
            css,
            re.DOTALL | re.IGNORECASE,
        )
        self.assertIsNotNone(match, "Missing max-width:760px media query")
        body = match.group(1)
        grid_match = re.search(r'\.demo-grid\s*\{([^{}]*)\}', body)
        self.assertIsNotNone(grid_match, "Missing .demo-grid rule in max-width:760px media query")
        grid_text = grid_match.group(1).replace(" ", "")
        self.assertRegex(grid_text, r'grid-template-columns:1fr(?=;|$)')
        self.assertNotRegex(grid_text, r'grid-template-columns:1fr\s*1fr')

    def test_media_query_grid_template_columns_rejects_two_column_value(self):
        one_column = "grid-template-columns:1fr;".replace(" ", "")
        two_columns = "grid-template-columns:1fr 1fr;".replace(" ", "")
        pattern = re.compile(r'grid-template-columns:1fr(?=;|$)', re.IGNORECASE)
        self.assertIsNotNone(pattern.search(one_column), "1fr should match")
        self.assertIsNone(pattern.search(two_columns), "1fr 1fr 1fr should NOT match single-column pattern")

    def test_switch_dimensions(self):
        css = self._css()
        self._assert_property(css, ".liquid-switch", "width", "56px")
        self._assert_property(css, ".liquid-switch", "height", "30px")
        self._assert_property(css, ".liquid-switch__thumb", "width", "22px")
        self._assert_property(css, ".liquid-switch__thumb", "height", "22px")
        self._assert_property(css, ".liquid-switch__thumb", "top", "4px")
        self._assert_property(css, ".liquid-switch__thumb", "left", "4px")
        self._assert_property(
            css,
            ".liquid-switch input:checked ~ .liquid-switch__thumb",
            "transform",
            "translateX(26px)",
        )

    def test_input_is_visually_hidden_but_accessible(self):
        css = self._css()
        input_rule = self._find_rule(css, ".liquid-switch input")
        self.assertIn("clip-path:inset(50%)", input_rule)
        self.assertIn("border:0", input_rule)
        self.assertIn("clip:rect(0 0 0 0)", input_rule)
        self.assertIn("opacity:0", input_rule)

    def test_transition_timing(self):
        css = self._css()
        thumb_body = self._find_rule(css, ".liquid-switch__thumb")
        self.assertIn("260ms", thumb_body)
        self.assertIn("cubic-bezier(.34,1.56,.64,1)", thumb_body)
        self.assertIn("120ms", thumb_body)
        self._assert_property(
            css,
            ".liquid-switch__thumb",
            "transition",
            "transform 260ms cubic-bezier(.34,1.56,.64,1),border-radius 120ms ease,box-shadow 210ms ease",
        )
        track_body = self._find_rule(css, ".liquid-switch__track")
        self.assertIn("210ms", track_body)
        self.assertIn("240ms", track_body)
        self.assertIn("120ms", track_body)

    def test_thumb_will_change_includes_transform_border_radius_box_shadow(self):
        css = self._css()
        thumb_body = self._find_rule(css, ".liquid-switch__thumb")
        self.assertIn("will-change:transform,border-radius,box-shadow", thumb_body)

    def test_active_states(self):
        css = self._css()
        self._assert_property(css, ".liquid-switch:active .liquid-switch__track", "transform", "scale(.965)")
        self._assert_property(css, ".liquid-switch:active .liquid-switch__thumb", "transform", "scaleX(1.2)")
        self._assert_property(css, ".liquid-switch:active .liquid-switch__thumb", "border-radius", "44% 56% 56% 44%")
        self._assert_property(
            css,
            ".liquid-switch:active input:checked ~ .liquid-switch__thumb",
            "border-radius",
            "56% 44% 44% 56%",
        )
        self._assert_property(
            css,
            ".liquid-switch:active input:checked ~ .liquid-switch__thumb",
            "transform",
            "translateX(26px) scaleX(1.2)",
        )

    def test_checked_track(self):
        css = self._css()
        checked_track = ".liquid-switch input:checked ~ .liquid-switch__track"
        self._assert_property(css, checked_track, "background", "linear-gradient(120deg,var(--success-color),#5ee681)")
        self._assert_property(css, checked_track, "border-color", "rgba(116,241,147,.66)")
        body = self._find_rule(css, checked_track)
        self.assertIn("0 0 14px rgba(48,209,88,.24)", body)
        self.assertIn("inset", body)

    def test_focus_visible(self):
        css = self._css()
        focus_track = ".liquid-switch input:focus-visible ~ .liquid-switch__track"
        self._assert_property(css, focus_track, "outline", "3px solid var(--accent-color)")
        self._assert_property(css, focus_track, "outline-offset", "3px")

    def test_reduced_motion(self):
        css = self._css()
        match = re.search(
            r'@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}',
            css,
            re.DOTALL | re.IGNORECASE,
        )
        self.assertIsNotNone(match, "Missing prefers-reduced-motion media query")
        body = match.group(1)
        track_match = re.search(r'\.liquid-switch__track\s*\{([^{}]*)\}', body)
        thumb_match = re.search(r'\.liquid-switch__thumb\s*\{([^{}]*)\}', body)
        self.assertIsNotNone(track_match, "Missing track rule in reduced motion")
        self.assertIsNotNone(thumb_match, "Missing thumb rule in reduced motion")
        track_text = track_match.group(1).replace(" ", "")
        thumb_text = thumb_match.group(1).replace(" ", "")
        self.assertIn("1mslinear", track_text)
        self.assertIn("1mslinear", thumb_text)
        self.assertIn("box-shadow1mslinear", thumb_text)

    def test_off_track_adaptations(self):
        css = self._css()
        self._assert_property(css, ".demo-panel--dark .liquid-switch__track", "background", "rgba(255,255,255,.12)")
        self._assert_property(css, ".demo-panel--dark .liquid-switch__track", "border", "1px solid rgba(255,255,255,.15)")
        self._assert_property(css, ".demo-panel--dark .liquid-switch__track", "box-shadow", "inset 0 1px 2px rgba(0,0,0,0.2)")
        self._assert_property(css, ".demo-panel--light .liquid-switch__track", "background", "rgba(30,34,45,.12)")
        self._assert_property(css, ".demo-panel--light .liquid-switch__track", "border", "1px solid rgba(30,34,45,.12)")
        self._assert_property(css, ".demo-panel--light .liquid-switch__track", "box-shadow", "inset 0 1px 2px rgba(0,0,0,0.05)")

    def test_panel_themes(self):
        css = self._css()
        self._assert_property(css, ".demo-panel", "border-radius", "24px")
        self._assert_property(css, ".demo-panel--dark", "border", "var(--liquid-border-dark)")
        self._assert_property(css, ".demo-panel--light", "border", "var(--liquid-border-light)")

    def test_setting_label_and_desc_are_block_level(self):
        css = self._css()
        self._assert_property(css, ".setting-label", "display", "block")
        self._assert_property(css, ".setting-desc", "display", "block")


if __name__ == "__main__":
    unittest.main()
