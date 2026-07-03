// ===== DOM Cache =====
    const dynamicIsland = document.getElementById('dynamicIsland');
    const dynamicIslandClose = document.getElementById('dynamicIslandClose');
    const dynamicIslandWelcome = document.getElementById('dynamicIslandWelcome');
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const searchResults = document.getElementById('searchResults');
    const albumArt = document.getElementById('albumArt');
    const albumArtContainer = document.getElementById('albumArtContainer');
    const nowPlayingTitle = document.getElementById('nowPlayingTitle');
    const nowPlayingArtist = document.getElementById('nowPlayingArtist');
    const progressBar = document.getElementById('progressBar');
    const progress = document.getElementById('progress');
    const currentTimeDisplay = document.getElementById('currentTime');
    const durationDisplay = document.getElementById('duration');
    const playButton = document.getElementById('playButton');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const audioPlayer = document.getElementById('audioPlayer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    const pagination = document.getElementById('pagination');
    const volumeSlider = document.getElementById('volumeSlider');
    const playlistItems = document.getElementById('playlistItems');
    const clearPlaylist = document.getElementById('clearPlaylist');
    const saveWallpaperBtn = document.getElementById('saveWallpaperBtn');
    const shareMusicBtn = document.getElementById('shareMusicBtn');
    const desktopLyricsBtn = document.getElementById('desktopLyricsBtn');
    const themeToggle = document.getElementById('themeToggle');
    const settingsToggle = document.getElementById('settingsToggle');
    const settingsModalOverlay = document.getElementById('settingsModalOverlay');
    const settingsModalClose = document.getElementById('settingsModalClose');
    const enableTranslation = document.getElementById('enableTranslation');
    const translationScopeRadios = document.querySelectorAll('input[name="translationScope"]');
    const apiTokenInput = document.getElementById('apiTokenInput');
    const testApiBtn = document.getElementById('testApiBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const eqEnabledToggle = document.getElementById('eqEnabledToggle');
    const eqPresetSelect = document.getElementById('eqPresetSelect');
    const eqPreampSlider = document.getElementById('eqPreampSlider');
    const eqPreampValue = document.getElementById('eqPreampValue');
    const eqResetBtn = document.getElementById('eqResetBtn');
    const eqStatusChip = document.getElementById('eqStatusChip');
    const eqStatusText = document.getElementById('eqStatusText');
    const eqBandSliders = document.querySelectorAll('.eq-band-slider[data-band-index]');
    const eqBandValueEls = document.querySelectorAll('.eq-band-value[data-band-value]');
    const playModeBtn = document.getElementById('playModeBtn');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarClose = document.getElementById('sidebarClose');
    const sidebarTabs = document.querySelectorAll('.sidebar-tab');
    const amBackground = document.querySelector('.am-background');
    const amLyrics = document.getElementById('amLyrics');
    const amllStatus = document.getElementById('amllStatus');
    const lyricsRendererModeRadios = document.querySelectorAll('input[name="lyricsRendererMode"]');
    const AMLL_CORE_ESM_URL = 'https://esm.sh/@applemusic-like-lyrics/core@0.5.1?bundle';
    const AMLL_LYRIC_ESM_URL = 'https://esm.sh/@applemusic-like-lyrics/lyric@1.0.1?bundle';
    const AMLL_TTML_DB_MIRROR = 'https://amlldb.bikonoo.com/ncm-lyrics/';
    const AMLL_TTML_DB_GITHUB = 'https://raw.githubusercontent.com/amll-dev/amll-ttml-db/main/ncm-lyrics/';
    const AMLL_TTML_SOURCE_KEY = 'amllTtmlSource';
    let AMLL_TTML_DB_BASE = localStorage.getItem(AMLL_TTML_SOURCE_KEY) === 'github' ? AMLL_TTML_DB_GITHUB : AMLL_TTML_DB_MIRROR;
    const rightcontent = document.getElementById('rightcontent');
    const lyricsToggleBtn = document.getElementById('lyricsToggleBtn');
    const originalTitle = "Harmonia - 音乐播放器";
    const enableWordLyrics = document.getElementById('enableWordLyrics');
    const enableWordLyricJump = document.getElementById('enableWordLyricJump');
    const neteaseProxyInput = document.getElementById('neteaseProxyInput');
    const musicSourceRadios = document.querySelectorAll('input[name="musicSource"]');
    const kugouQualityRadios = document.querySelectorAll('input[name="kugouAudioQuality"]');
    const kugouVipStatusText = document.getElementById('kugouVipStatusText');
    const kugouVipStatusPill = document.getElementById('kugouVipStatusPill');
    const kugouVipDetailText = document.getElementById('kugouVipDetailText');
    const kugouVipProgressText = document.getElementById('kugouVipProgressText');
    const kugouVipAutoToggle = document.getElementById('kugouVipAutoToggle');
    const kugouVipRefreshBtn = document.getElementById('kugouVipRefreshBtn');
    const kugouVipAutoBtn = document.getElementById('kugouVipAutoBtn');
    const KUGOU_QUALITY_KEY = 'kugouAudioQuality';
    const KUGOU_VIP_AUTO_KEY = 'kugouVipAutoEnabled';
    const KUGOU_VIP_LAST_AUTO_DATE_KEY = 'kugouVipLastAutoDate';
    const KUGOU_VIP_LAST_STATUS_KEY = 'kugouVipLastStatus';
    const KUGOU_VIP_STATUS_CACHE_VERSION = 2;
    const KUGOU_API_NO_CACHE_PARAM = '_t';
    const KUGOU_USER_INFO_CACHE_KEY = 'kugouUserInfoCache';
    const KUGOU_USER_INFO_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    const KUGOU_TOKEN_CACHE_KEY = 'kugouTokenIssuedAt';
    const KUGOU_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
    let kugouApiNoCacheCounter = 0;
    const kugouPendingRequests = new Map(); // request dedup key -> promise
    let kugouVipRefreshPromise = null;
    const BUILTIN_NETEASE_PROXIES = ['https://cors.harmoniamusicplayer.dpdns.org/api/proxy?url='];
    const isMobileDevice = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const collapsedTextSpan = document.querySelector('.collapsed-text'); // 灵动岛折叠文字
    const MUSIC_SOURCE_KEY = 'musicSource';
    const ALBUM_KEY = 'albumEffectEnabled';
    const LYRICS_RENDERER_MODE_KEY = 'lyricsRendererMode';
    const LYRICS_ANIMATION_MODE_KEY = 'lyricsAnimationMode';
    const PLAYER_CONTROLS_LAYOUT_KEY = 'playerControlsLayout';
    const lyricsRerequestBtn = document.getElementById('lyricsRerequestBtn');
    const lyricsRerequestModalOverlay = document.getElementById('lyricsRerequestModalOverlay');
    const lyricsRerequestCopy = document.getElementById('lyricsRerequestCopy');
    const lyricsRerequestCancelBtn = document.getElementById('lyricsRerequestCancelBtn');
    const lyricsRerequestConfirmBtn = document.getElementById('lyricsRerequestConfirmBtn');
    const LIFT_AMOUNT_PX = 2;
    const LIFT_CURVE_POWER = 10;

    // ===== 新功能 DOM 引用 =====
    const audioPlayerB = document.getElementById('audioPlayerB');
    const shareBtn = document.getElementById('shareBtn');
    const posterModalOverlay = document.getElementById('posterModalOverlay');
    const posterModalClose = document.getElementById('posterModalClose');
    const posterCanvas = document.getElementById('posterCanvas');
    const posterCopyBtn = document.getElementById('posterCopyBtn');
    const posterDownloadBtn = document.getElementById('posterDownloadBtn');
    const pipBtn = document.getElementById('pipBtn');

    // ===== PiP 画中画状态 =====
    let pipWindow = null;
    let pipUpdateInterval = null;
    let pipLastProgressPercent = -1;

    function getPlaybackProgressPercent() {
      const duration = audioPlayer.duration || 0;
      if (!duration || isNaN(duration)) return 0;
      const currentTime = audioPlayer.currentTime || 0;
      return Math.min(100, Math.max(0, Math.round((currentTime / duration) * 1000) / 10));
    }

    function updatePipProgress(percent = getPlaybackProgressPercent(), force = false) {
      if (!pipWindow || pipWindow.closed) return;
      if (!force && percent === pipLastProgressPercent) return;
      pipLastProgressPercent = percent;
      try {
        pipWindow.updatePipProgress?.(percent);
      } catch (_) {}
    }

    // ===== Gapless / Crossfade 状态 =====
    const CROSSFADE_DURATION = 3;
    let gaplessPreloadAbort = null;
    let gaplessPreloadUrl = null;
    let isCrossfading = false;

    function normalizeMusicSource(source) {
      return source === 'kugou' ? 'kugou' : 'netease';
    }

    function getMusicSourceName(source) {
      return normalizeMusicSource(source) === 'kugou' ? '酷狗' : '网易云';
    }

    function isKugouSongLike(song) {
      if (!song || typeof song !== 'object') return false;
      if (normalizeMusicSource(song.source) === 'kugou') return true;
      const hash = String(song.hash || song.FileHash || song.Hash || '').trim();
      const id = String(song.id || song.lyric_id || '').trim();
      const pic = String(song.pic_id || song.Image || '').trim();
      return /^[a-f0-9]{32}$/i.test(hash)
        || /^[a-f0-9]{32}$/i.test(id)
        || /kugou|kgimg|kugoucdn|\{size\}/i.test(pic);
    }

    function getSongSource(song) {
      if (song?.source) return normalizeMusicSource(song.source);
      if (isKugouSongLike(song)) return 'kugou';
      return normalizeMusicSource(currentSettings?.source || 'netease');
    }

    function normalizeKugouImageUrl(url) {
      if (typeof url !== 'string' || !url.trim()) return '';
      return url.replace('{size}', '500');
    }

    function extractNameFromKugouFileName(fileName, fallbackArtist = '') {
      if (typeof fileName !== 'string') return '';
      const splitMark = ' - ';
      const idx = fileName.indexOf(splitMark);
      if (idx > 0) {
        const artistPart = fileName.slice(0, idx).trim();
        const titlePart = fileName.slice(idx + splitMark.length).trim();
        if (titlePart) return titlePart;
        if (!fallbackArtist && artistPart) return artistPart;
      }
      return fileName.trim();
    }

    function toArtistText(artist) {
      return Array.isArray(artist) ? artist.join('、') : (artist || '未知歌手');
    }

    function normalizeTrack(track = {}, fallbackSource = 'netease') {
      const source = normalizeMusicSource(track.source || fallbackSource);
      return {
        ...track,
        source
      };
    }

    function normalizeStoredTrackList(list) {
      if (!Array.isArray(list)) return [];
      return list
        .filter(item => item && typeof item === 'object')
        .map(item => normalizeTrack(item, 'netease'));
    }

    function normalizeKugouSearchResult(item = {}) {
      const hash = (item.FileHash || item.Hash || item.SQ?.Hash || '').trim();
      if (!hash) return null;
      const artist = item.SingerName || (Array.isArray(item.Singers) ? item.Singers.map(x => x?.name).filter(Boolean).join('、') : '');
      let name = '';
      if (item.FileName) {
        name = extractNameFromKugouFileName(item.FileName, artist);
      }
      if (!name && item.OriSongName) {
        name = item.OriSongName;
        if (item.Suffix && !name.includes(item.Suffix)) {
          name += item.Suffix;
        }
      }
      name = name || '未知歌曲';
      
      return {
        id: hash,
        hash,
        source: 'kugou',
        name,
        artist: artist || '未知歌手',
        album: item.AlbumName || '',
        pic_id: normalizeKugouImageUrl(item.Image || ''),
        lyric_id: hash,
        duration: Number(item.Duration) || 0
      };
    }

    function getSourceBadgeHtml(song) {
      const source = getSongSource(song);
      return `<span class="source-badge ${source}">${getMusicSourceName(source)}</span>`;
    }

    function applyMusicSource(source, { persist = true, toast = false } = {}) {
      const normalized = normalizeMusicSource(source);
      currentSettings.source = normalized;
      musicSourceRadios.forEach(radio => {
        radio.checked = radio.value === normalized;
      });
      if (persist) {
        localStorage.setItem(MUSIC_SOURCE_KEY, normalized);
      }
      if (toast) {
        showDynamicIslandToast(`已切换音源：${getMusicSourceName(normalized)}`, 1800);
      }
    }

    function normalizeKugouQuality(value) {
      const allowed = ['128', '320', 'flac', 'high'];
      return allowed.includes(String(value)) ? String(value) : '320';
    }

    function getKugouQualityName(value = getKugouAudioQuality()) {
      const normalized = normalizeKugouQuality(value);
      const names = {
        '128': '128 MP3',
        '320': '320 MP3',
        flac: 'FLAC',
        high: '无损'
      };
      return names[normalized] || '320 MP3';
    }

    function getKugouAudioQuality() {
      return normalizeKugouQuality(localStorage.getItem(KUGOU_QUALITY_KEY) || currentSettings.kugouQuality || '320');
    }

    function applyKugouAudioQuality(value, { persist = true, toast = false } = {}) {
      const normalized = normalizeKugouQuality(value);
      currentSettings.kugouQuality = normalized;
      kugouQualityRadios.forEach(radio => {
        radio.checked = radio.value === normalized;
      });
      if (persist) {
        localStorage.setItem(KUGOU_QUALITY_KEY, normalized);
      }
      if (toast) {
        showDynamicIslandToast(`酷狗音质已切换：${getKugouQualityName(normalized)}`, 1800);
      }
      return normalized;
    }

    function safeJsonParse(value, fallback = null) {
      try {
        return value ? JSON.parse(value) : fallback;
      } catch (error) {
        return fallback;
      }
    }

    function getKugouVipCacheRecord() {
      const raw = safeJsonParse(localStorage.getItem(KUGOU_VIP_LAST_STATUS_KEY));
      if (!raw) return null;

      if (raw.version === KUGOU_VIP_STATUS_CACHE_VERSION && raw.detail) {
        return raw;
      }

      if (raw.status !== undefined && raw.data) {
        return {
          version: 1,
          userId: String(raw?.data?.userid || localStorage.getItem('kugouUserId') || ''),
          checkedAt: 0,
          detail: raw
        };
      }

      return null;
    }

    function isKugouVipCacheForCurrentAccount(record) {
      if (!record || !record.detail) return false;
      const savedUserId = String(localStorage.getItem('kugouUserId') || kugouUserId || '').trim();
      const recordUserId = String(record.userId || record?.detail?.data?.userid || '').trim();
      if (!savedUserId || !recordUserId) return !!kugouToken;
      return savedUserId === recordUserId;
    }

    function saveKugouVipCache(detail) {
      if (!detail || typeof detail !== 'object') return;
      const record = {
        version: KUGOU_VIP_STATUS_CACHE_VERSION,
        userId: String(detail?.data?.userid || localStorage.getItem('kugouUserId') || kugouUserId || ''),
        checkedAt: Date.now(),
        checkedDate: getLocalDateKey(),
        detail
      };
      localStorage.setItem(KUGOU_VIP_LAST_STATUS_KEY, JSON.stringify(record));
    }

    function getKugouVipCacheCheckedText(record) {
      if (!record?.checkedAt) return '已显示上次识别结果。';
      return `已显示上次识别结果：${new Date(record.checkedAt).toLocaleString()}。`;
    }

    function restoreKugouVipStatusFromCache(progress = '') {
      if (!kugouToken) {
        setKugouVipStatusUI(null, progress || '请先登录酷狗账号。');
        return null;
      }
      const record = getKugouVipCacheRecord();
      if (!isKugouVipCacheForCurrentAccount(record)) {
        setKugouVipStatusUI(null, progress || '登录状态已读取，可识别 VIP 身份。');
        return null;
      }
      const analysis = analyzeKugouVipDetail(record.detail);
      setKugouVipStatusUI(analysis, progress || getKugouVipCacheCheckedText(record));
      return analysis;
    }

    function getLocalDateKey(date = new Date()) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    function isKugouTokenExpired() {
      const issuedAt = Number(localStorage.getItem(KUGOU_TOKEN_CACHE_KEY) || 0);
      if (!issuedAt) return false;
      return Date.now() - issuedAt > KUGOU_TOKEN_TTL_MS;
    }

    function markKugouTokenIssued() {
      try { localStorage.setItem(KUGOU_TOKEN_CACHE_KEY, String(Date.now())); } catch (e) { /* ignore */ }
    }

    async function wrappedFetchWithRetry(input, init, retries = 2) {
      let lastError;
      for (let i = 0; i <= retries; i++) {
        try {
          return await wrappedFetch(input, init);
        } catch (error) {
          lastError = error;
          const msg = String(error.message || '');
          if (msg.includes('酷狗凭证已失效') || msg.includes('152') || msg.includes('未登录')) {
            throw error; // don't retry auth errors
          }
          if (i < retries) {
            await delay(Math.min(1000 * 2 ** i, 8000));
          }
        }
      }
      throw lastError;
    }

    function parseKugouDateTime(value) {
      if (!value || typeof value !== 'string') return null;
      const normalized = value.replace(/-/g, '/');
      const date = new Date(normalized);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    function formatKugouDateTime(value) {
      const date = parseKugouDateTime(value);
      if (!date) return value || '未知';
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${d} ${hh}:${mm}`;
    }

    function isKugouVipEntryActive(entry) {
      if (!entry || Number(entry.is_vip) !== 1 || Number(entry.is_paid_vip) !== 1) return false;

      const endTimeStr = entry.vip_end_time || entry.su_vip_end_time || entry.m_end_time;
      if (!endTimeStr || typeof endTimeStr !== 'string') return false;

      const normalized = endTimeStr.replace(/-/g, '/').replace(/\.\d+/, '');
      const endDate = new Date(normalized);
      if (isNaN(endDate.getTime())) return false; // 无效日期视为异常

      const now = new Date();
      return endDate.getTime() > now.getTime();
    }

    function getKugouConceptEntries(detail) {
      const list = detail?.data?.busi_vip;
      if (!Array.isArray(list)) return [];
      return list.filter(item => item && item.busi_type === 'concept');
    }

    function analyzeKugouVipDetail(detail) {
      const conceptEntries = getKugouConceptEntries(detail);
      const activeEntries = conceptEntries.filter(isKugouVipEntryActive);

      let activeSvip = null;
      let activeTvip = null;
      for (const entry of activeEntries) {
        if (entry.product_type === 'svip') {
          activeSvip = entry;
          break; // SVIP 优先级最高，找到即停
        }
      }
      if (!activeSvip) {
        for (const entry of activeEntries) {
          if (entry.product_type === 'tvip') {
            activeTvip = entry;
            break;
          }
        }
      }

      const anyActive = activeSvip || activeTvip || activeEntries[0] || null;
      const rootIsVip = Number(detail?.data?.is_vip) === 1;

      let state = 'none';
      let label = '未开通';
      let pill = '未识别';
      let pillType = 'error';
      let detailText = '未识别到概念版 VIP；可点击下方按钮按流程领取并升级。';

      if (activeSvip) {
        state = 'svip';
        label = '概念版 VIP 已生效';
        pill = 'SVIP';
        pillType = 'success';
        detailText = `概念版 SVIP 有效期至：${formatKugouDateTime(activeSvip.vip_end_time)}。`;
      } else if (activeTvip) {
        state = 'tvip';
        label = '已开通 TVIP';
        pill = 'TVIP';
        pillType = 'warning';
        detailText = `检测到 TVIP 有效期至：${formatKugouDateTime(activeTvip.vip_end_time)}；可继续执行升级为概念版 SVIP。`;
      } else if (activeEntries.length) {
        state = 'other';
        label = '存在其他概念版权益';
        pill = '需确认';
        pillType = 'warning';
        detailText = `检测到 ${activeEntries[0].product_type || '未知'} 权益，有效期至：${formatKugouDateTime(activeEntries[0].vip_end_time)}。`;
      } else if (rootIsVip) {
        state = 'root_vip';
        label = '账号已有普通 VIP';
        pill = '非概念版';
        pillType = 'warning';
        detailText = '账号存在普通 VIP 标记，但未识别到 concept/SVIP 记录。';
      }

      return {
        state,
        label,
        pill,
        pillType,
        detailText,
        activeSvip,
        activeTvip,
        anyActive,
        conceptEntries,
        raw: detail
      };
    }

    function setKugouVipStatusUI(analysis = null, progress = '') {
      if (!kugouVipStatusText || !kugouVipStatusPill || !kugouVipDetailText) return;
      if (!analysis) {
        kugouVipStatusText.textContent = kugouToken ? 'VIP 身份：待检测' : 'VIP 身份：未登录';
        kugouVipStatusPill.textContent = kugouToken ? '待检测' : '未登录';
        kugouVipStatusPill.className = `vip-pill ${kugouToken ? '' : 'error'}`;
        kugouVipDetailText.textContent = kugouToken ? '点下方“识别 VIP 身份”看看当前状态。' : '请先登录酷狗，才能查看和领取 VIP 权益。';
      } else {
        kugouVipStatusText.textContent = `VIP 身份：${analysis.label}`;
        kugouVipStatusPill.textContent = analysis.pill;
        kugouVipStatusPill.className = `vip-pill ${analysis.pillType || ''}`;
        kugouVipDetailText.textContent = analysis.detailText;
      }
      if (kugouVipProgressText && typeof progress === 'string') {
        kugouVipProgressText.textContent = progress;
      }
    }

    function setKugouVipControlsLoading(loading) {
      [kugouVipRefreshBtn, kugouVipAutoBtn].forEach(btn => {
        if (!btn) return;
        btn.disabled = !!loading;
      });
      if (kugouVipRefreshBtn) kugouVipRefreshBtn.innerHTML = loading ? '<i class="fas fa-spinner fa-spin"></i> 处理中...' : '<i class="fas fa-sync-alt"></i> 刷新状态';
      if (kugouVipAutoBtn) kugouVipAutoBtn.innerHTML = loading ? '<i class="fas fa-spinner fa-spin"></i> 正在处理...' : '<i class="fas fa-bolt"></i> 一键领取并升级';
    }

    // ==================== 酷狗 API ====================
    const KUGOU_API_BASE = 'https://api-kugou.harmoniamusicplayer.dpdns.org';

    function buildKugouApiUrl(path, params = {}, includeToken = true, skipTimestamp = true) {
      const url = new URL(`${KUGOU_API_BASE}${path}`);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, String(value));
        }
      });
      if (includeToken && kugouToken && !url.searchParams.has('token')) {
        url.searchParams.set('token', kugouToken);
      }
      if (!skipTimestamp && !url.searchParams.has(KUGOU_API_NO_CACHE_PARAM)) {
        kugouApiNoCacheCounter += 1;
        url.searchParams.set(KUGOU_API_NO_CACHE_PARAM, `${Date.now()}_${kugouApiNoCacheCounter}`);
      }
      return url.toString();
    }

    // Request deduplication: prevent duplicate in-flight API calls for the same key
    async function withKugouRequestDedup(key, fetcher, ttlMs = 30000) {
      const existing = kugouPendingRequests.get(key);
      if (existing) {
        try { return await existing; } catch (e) { throw e; }
      }
      let resolve, reject;
      const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
      const timer = setTimeout(() => kugouPendingRequests.delete(key), ttlMs);
      kugouPendingRequests.set(key, promise);
      (async () => {
        try { const result = await fetcher(); resolve(result); return result; }
        catch (e) { reject(e); throw e; }
        finally { clearTimeout(timer); kugouPendingRequests.delete(key); }
      })();
      return promise;
    }

    async function fetchKugouVipDetail() {
      if (!kugouToken) throw new Error('请先登录酷狗账号');
      const res = await wrappedFetchWithRetry(buildKugouApiUrl('/user/vip/detail', {}, true, false), { credentials: 'include' });
      if (!res.ok) throw new Error('VIP 身份识别请求失败');
      const data = await res.json();
      if (data.status !== 1) throw new Error(data.error_msg || data.msg || 'VIP 身份识别失败');
      // 顺便缓存用户信息（昵称/头像），减少额外请求
      try {
        const userInfo = data?.data || {};
        if (userInfo.nickname) localStorage.setItem('kugouNickname', userInfo.nickname);
        if (userInfo.pic) localStorage.setItem('kugouPic', userInfo.pic);
        localStorage.setItem(KUGOU_USER_INFO_CACHE_KEY, JSON.stringify({
          nickname: userInfo.nickname || localStorage.getItem('kugouNickname'),
          pic: userInfo.pic || localStorage.getItem('kugouPic'),
          ts: Date.now()
        }));
      } catch (e) { /* ignore cache write error */ }
      kugouVipLastDetail = data;
      saveKugouVipCache(data);
      return data;
    }

    async function fetchKugouUserInfo() {
      if (!kugouToken) return null;
      // 优先使用本地缓存（7天内有效）
      try {
        const cached = JSON.parse(localStorage.getItem(KUGOU_USER_INFO_CACHE_KEY) || 'null');
        if (cached && Date.now() - (cached.ts || 0) < KUGOU_USER_INFO_CACHE_TTL_MS) {
          return cached;
        }
      } catch (e) { /* ignore */ }
      // 缓存失效或不存在，调用 VIP 接口顺便获取，并统一写入新旧缓存
      try {
        const detail = await fetchKugouVipDetail();
        const userInfo = detail?.data || {};
        const nickname = userInfo.nickname || localStorage.getItem('kugouNickname');
        const pic = userInfo.pic || localStorage.getItem('kugouPic');
        const record = { nickname, pic, ts: Date.now() };
        try { localStorage.setItem(KUGOU_USER_INFO_CACHE_KEY, JSON.stringify(record)); } catch (e) { /* ignore */ }
        return record;
      } catch (e) {
        return null;
      }
    }

    async function refreshKugouVipStatus({ silent = false } = {}) {
      if (!kugouToken) {
        setKugouVipStatusUI(null, '请先登录酷狗账号。');
        if (!silent) showError('请先登录酷狗账号', 2200);
        return null;
      }
      if (!silent) setKugouVipControlsLoading(true);
      try {
        const analysis = await withKugouRequestDedup('kugou-vip-refresh', async () => {
          const detail = await fetchKugouVipDetail();
          const result = analyzeKugouVipDetail(detail);
          setKugouVipStatusUI(result, `上次识别：${new Date().toLocaleString()}。`);
          return result;
        });
        return analysis;
      } catch (error) {
        const cached = restoreKugouVipStatusFromCache(`实时识别失败：${error.message}。已保留上次识别结果，稍后可再次刷新。`);
        if (!cached) {
          setKugouVipStatusUI(null, `识别失败：${error.message}`);
        }
        if (!silent) showError(`识别失败：${error.message}`, 3000);
        return cached;
      } finally {
        if (!silent) setKugouVipControlsLoading(false);
      }
    }

    async function claimKugouYouthVipUntilComplete({ onProgress } = {}) {
      return withKugouRequestDedup('kugou-vip-claim', async () => {
        const maxCalls = 8;
        let lastPayload = null;
        for (let i = 0; i < maxCalls; i++) {
          const res = await wrappedFetch(buildKugouApiUrl('/youth/vip', {}, true, false), { credentials: 'include' });
          if (!res.ok) throw new Error('领取 VIP 请求失败');
          const payload = await res.json();
          if (payload.status !== 1) throw new Error(payload.error_msg || payload.msg || '领取 VIP 失败');
          lastPayload = payload;
          const data = payload.data || {};
          const total = Number(data.total) || maxCalls;
          const done = Number(data.done) || 0;
          const remain = Number(data.remain);
          const remainVipHour = Number(data.remain_vip_hour);
          const award = Number(data.award_vip_hour) || 3;
          onProgress?.(`领取进度：${Math.min(done, total)}/${total}，本次增加 ${award} 小时，剩余待领取 ${Number.isFinite(remainVipHour) ? remainVipHour : Math.max(total - done, 0) * award} 小时。`);
          if (remainVipHour <= 0 || remain <= 0 || done >= total) break;
          await delay(650);
        }
        return lastPayload;
      });
    }

    async function upgradeKugouYouthVip({ onProgress } = {}) {
      return withKugouRequestDedup('kugou-vip-upgrade', async () => {
        onProgress?.('正在升级为概念版 VIP...');
          const res = await wrappedFetch(buildKugouApiUrl('/youth/day/vip/upgrade', {}, true, false), { credentials: 'include' });
        if (!res.ok) throw new Error('升级概念版 VIP 请求失败');
        const payload = await res.json();
        if (payload.status !== 1) throw new Error(payload.error_msg || payload.msg || '升级概念版 VIP 失败');
        const hours = payload?.data?.recharge_hours;
        onProgress?.(`升级请求成功${hours ? `，已处理 ${hours} 小时权益` : ''}，正在复查身份...`);
        return payload;
      });
    }

    let kugouVipAutoLoopTimer = null;
    let kugouVipAutoLoopActive = false;

    async function runKugouVipClaimAndUpgrade({ manual = false, isAutoLoop = false } = {}) {
        if (kugouVipOperationInProgress) {
            if (manual) showError('VIP 流程正在执行，请勿重复点击', 2200);
            return null;
        }
        if (!kugouToken) {
            setKugouVipStatusUI(null, '请先登录酷狗账号。');
            if (manual) triggerKugouReLogin();
            return null;
        }

        kugouVipOperationInProgress = true;
        setKugouVipControlsLoading(true);
        const progressLines = [];
        const pushProgress = (line) => {
            progressLines.push(line);
            const latest = progressLines.slice(-4).join('\n');
            if (kugouVipProgressText) kugouVipProgressText.textContent = latest;
        };

        try {
            pushProgress('正在查看你的 VIP 状态...');
            let detail = await fetchKugouVipDetail();
            let analysis = analyzeKugouVipDetail(detail);
            setKugouVipStatusUI(analysis, progressLines.join('\n'));

            if (analysis.state === 'svip') {
                pushProgress('你已经是概念版 SVIP 了，不需要再领。');
                localStorage.setItem(KUGOU_VIP_LAST_AUTO_DATE_KEY, getLocalDateKey());
                return analysis;
            }

            pushProgress('准备领取今日 VIP...');
            const { payload, remain, done, total } = await claimKugouYouthVipOnce({ onProgress: pushProgress });

            if (remain > 0) {
                pushProgress(`今天还能领 ${remain} 次，稍后自动继续。`);
                if (kugouVipAutoLoopTimer) clearTimeout(kugouVipAutoLoopTimer);
                kugouVipAutoLoopTimer = setTimeout(() => {
                    runKugouVipClaimAndUpgrade({ manual: false, isAutoLoop: true });
                }, 2 * 60 * 1000);
                kugouVipAutoLoopActive = true;
                return null;
            } else {
                pushProgress('今天领的次数用完了，试试升级概念版 VIP...');
                await upgradeKugouYouthVip({ onProgress: pushProgress });
                await delay(700);
                detail = await fetchKugouVipDetail();
                analysis = analyzeKugouVipDetail(detail);
                setKugouVipStatusUI(analysis, progressLines.concat(`升级后状态：${analysis.label}`).slice(-5).join('\n'));
                localStorage.setItem(KUGOU_VIP_LAST_AUTO_DATE_KEY, getLocalDateKey());
                if (analysis.state === 'svip') {
                    showDynamicIslandToast('概念版 VIP 已生效', 2600);
                } else if (manual) {
                    showError('已完成操作，但暂未看到 SVIP 生效，过一会儿再点“刷新状态”看看', 3800);
                }
                return analysis;
            }
        } catch (error) {
            localStorage.setItem(KUGOU_VIP_LAST_AUTO_DATE_KEY, getLocalDateKey());
            pushProgress(`出错了：${error.message}`);
            if (manual) showError(`VIP 操作失败：${error.message}`, 4200);
            return null;
        } finally {
            kugouVipOperationInProgress = false;
            setKugouVipControlsLoading(false);
        }
    }
    function initKugouQualityAndVipSettings() {
      applyKugouAudioQuality(localStorage.getItem(KUGOU_QUALITY_KEY) || currentSettings.kugouQuality || '320', { persist: false, toast: false });
      kugouQualityRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
          if (!e.target.checked) return;
          applyKugouAudioQuality(e.target.value, { persist: true, toast: true });
        });
      });

      if (kugouVipAutoToggle) {
        kugouVipAutoToggle.checked = localStorage.getItem(KUGOU_VIP_AUTO_KEY) === 'true';
        kugouVipAutoToggle.addEventListener('change', (e) => {
            localStorage.setItem(KUGOU_VIP_AUTO_KEY, e.target.checked ? 'true' : 'false');
            showDynamicIslandToast(e.target.checked ? '已开启每日自动领取（每2分钟一次）' : '已关闭 VIP 自动领取', 2200);
            if (e.target.checked) {
                scheduleKugouVipAutoRun(true);
            } else {
                clearKugouVipLoopTimer();
            }
        });
      }

      if (kugouVipRefreshBtn) {
        kugouVipRefreshBtn.addEventListener('click', () => refreshKugouVipStatus());
      }
      if (kugouVipAutoBtn) {
        kugouVipAutoBtn.addEventListener('click', () => runKugouVipClaimAndUpgrade({ manual: true }));
      }
      if (kugouToken) {
        restoreKugouVipStatusFromCache('已读取本地 VIP 识别结果，正在同步最新状态...');
        refreshKugouVipStatus({ silent: true });
      } else {
        setKugouVipStatusUI(null, '请先登录酷狗账号。');
      }
      scheduleKugouVipAutoRun(false);
    }

    function scheduleKugouVipAutoRun(force = false) {
        if (localStorage.getItem(KUGOU_VIP_AUTO_KEY) !== 'true') return;
        if (!kugouToken) return;
        const today = getLocalDateKey();
        const lastDate = localStorage.getItem(KUGOU_VIP_LAST_AUTO_DATE_KEY);
        if (!force && lastDate === today) return;

        if (kugouVipAutoLoopActive) return;

        window.setTimeout(() => {
            if (localStorage.getItem(KUGOU_VIP_AUTO_KEY) !== 'true') return;
            if (!kugouToken) return;
            const latestDate = localStorage.getItem(KUGOU_VIP_LAST_AUTO_DATE_KEY);
            if (!force && latestDate === today) return;
            runKugouVipClaimAndUpgrade({ manual: false, isAutoLoop: true });
        }, force ? 200 : 1200);
    }

    function clearKugouVipLoopTimer() {
        if (kugouVipAutoLoopTimer) {
            clearTimeout(kugouVipAutoLoopTimer);
            kugouVipAutoLoopTimer = null;
        }
        kugouVipAutoLoopActive = false;
    }

    // ===== State =====
    let currentPage = 1;
    let currentSearchResults = [];
    let currentTrackIndex = -1;
    let playlist = normalizeStoredTrackList(JSON.parse(localStorage.getItem('musicPlaylist')) || []);
    let favorites = normalizeStoredTrackList(JSON.parse(localStorage.getItem('musicFavorites')) || []);
    let history = normalizeStoredTrackList(JSON.parse(localStorage.getItem('musicHistory')) || []);
    let currentPlaylistIdx = -1;
    let currentActivePlaylist = playlist;
    let currentWallpaperUrl = '';
    let amLyricsData = [];
    let rawLyricText = '';
    let rawTlyricText = '';
    let isPlaying = false;
    let currentPlayMode = 'normal';
    let currentTab = 'playlist';
    let isDynamicIslandExpanded = false;
    let lyricsVisible = !isMobileDevice();
    let currentSongInfo = {name: '',artist: '',album: ''};
    let currentSongData = null;
    let sidebarSearchQuery = '';
    let sidebarSortMode = 'none'; // 'none', 'az', 'za', 'custom'
    let sidebarSourceFilter = null; // null, 'netease', 'kugou'
    let isDragging = false;
    let dragSourceIndex = -1;
    let customOrder = {}; // 存储每个列表的自定义顺序
    let currentPlayingId = null;  // 当前播放的歌曲ID
    let playlistOrder = [];       // 播放列表的当前顺序（ID数组）
    let playlistSelected = new Set(); // 播放列表中勾选的歌曲ID集合
    let isPlaylistDeleteMode = false; // 是否处于播放列表批量删除模式
    let isMobileLyricsFullscreen = false;
    let activeRequests = 0;                 // 当前正在进行的请求数
    let hasAnyRequestFailed = false;        // 当前请求组中是否有失败
    let requestStatusTimeout = null;        // 用于3秒后恢复文字的定时器
    let hasShownFirstRequestFailure = false;// 首次请求失败提示是否已弹出
    let dynamicIslandToastTimer = null;
    let dynamicIslandToastMeasurer = null;
    let albumMouseMoveHandler = null;
    let albumMouseLeaveHandler = null;
    let lyricsAnimationMode = 'visual';
    let playerControlsLayout = 'classic';
    let kugouToken = localStorage.getItem('kugouToken') || '';
    let kugouUserId = localStorage.getItem('kugouUserId') || '';
    let kugouDfid = localStorage.getItem('kugouDfid') || '';
    let collapsedTextAnimationQueue = Promise.resolve();
    let currentCollapsedTextAnimationTimer = null;
    let sidebarIndexCache = { playlist: new Map(), favorites: new Map(), history: new Map() };
    let searchResultsClickBound = false;
    let paginationClickBound = false;
    let playlistItemsClickBound = false;
    let albumTiltRAF = 0;
    let pendingAlbumTilt = null;
    let lastDesktopLyricsSentAt = 0;
    let lastRenderedProgressPercent = -1;
    let lastRenderedCurrentSecond = -1;
    let lastRenderedDurationSecond = -1;
    let lyricsRerequestInProgress = false;
    let kugouVipOperationInProgress = false;
    let kugouVipLastDetail = null;
    let amllCoreModule = null;
    let amllLyricModule = null;
    let amllPlayer = null;
    let amllPlayerReadyPromise = null;
    let amllPlayerRetrying = false;
    let amllFrameRAF = 0;
    let amllLastFrameTime = -1;
    let amllActive = false;
    let lastAmlLError = null;
    let lyricsRendererMode = 'amll';
    let currentLyricRenderLines = [];
    let currentLyricRenderOptions = { emptyText: '暂无歌词', hasRendered: false };
    const LRC = 'lrc', YRC = 'yrc', QRC = 'qrc', KRC = 'krc', TTML = 'ttml';
    let currentLyricFormat = LRC;
    const neteaseIdResolveCache = new Map();

    const LINE_HEIGHT = 20;
    let LYRICS_OFFSET = window.innerHeight / 3.5;
    let lastLyric = -1;
    let lastTitleLyricIndex = -1;
    let lastWordLyricTime = -1;
    let lastWordLyricLineIndex = -1;
    let lyricsHeightsPrefix = [0];
    let lyricsLayoutRAF = 0;
    let pendingLyricsLayout = null;

    function rebuildLyricsMetrics(data = amLyricsData) {
      if (!Array.isArray(data) || data.length === 0) {
        lyricsHeightsPrefix = [0];
        return;
      }

      const prefix = new Array(data.length + 1);
      prefix[0] = 0;

      for (let i = 0; i < data.length; i++) {
        const el = data[i]?.ele;
        const h = el ? el.offsetHeight : 0;
        prefix[i + 1] = prefix[i] + h + LINE_HEIGHT;
      }

      lyricsHeightsPrefix = prefix;
    }

    let desktopLyricsWs = null;
    let isDesktopLyricsConnected = false;
    let desktopLyricsRetryCount = 0;
    const MAX_RETRY_COUNT = 3;

    let currentSettings = {
      source: 'netease',
      quality: '999',
      kugouQuality: '320',
      bgMode: 'default',
      blurRadius: 5,
    };

    let translationSettings = {
      enabled: false,
      scope: 'no-translation', // 'no-translation' 或 'all-foreign'
      apiToken: ''
    };

    let lyricsSettings = {
      wordLyricsEnabled: false,
      wordLyricsJumpEnabled: true,
      neteaseProxy: ''
    };

    audioPlayer.volume = parseFloat(localStorage.getItem('musicPlayerVolume') || '0.7');
    volumeSlider.value = audioPlayer.volume;
    updateLyricsRerequestDialog();

    // ===== 音频均衡器 =====
    const EQ_STORAGE_KEY = 'musicPlayerEqSettings';
    const EQ_BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    const EQ_PRESETS = {
      flat: { label: '平坦 / 默认', preamp: 0, bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      warm: { label: '温暖耐听', preamp: -1, bands: [1.5, 1.2, 0.8, 0.3, -0.2, 0.4, 0.9, 1.2, 1.0, 0.5] },
      bass: { label: '低音增强', preamp: -2, bands: [4.5, 4, 3, 1.5, 0, -1, -1, 0, 0.8, 1.2] },
      deepbass: { label: '深沉低频', preamp: -3, bands: [6, 5, 3.5, 2, 0, -1.5, -2, -1, 0.5, 1] },
      vocal: { label: '人声增强', preamp: -2, bands: [-2, -1.5, -0.5, 1, 2.5, 4, 3.5, 2, -0.5, -1] },
      podcast: { label: '播客 / 语音', preamp: -3, bands: [-4, -3, -1, 1, 2.5, 3.5, 3.5, 2, -1, -2] },
      bright: { label: '明亮清晰', preamp: -1, bands: [-1, -1, 0, 0.5, 1, 2, 3, 4, 4.5, 4] },
      electronic: { label: '电子动感', preamp: -2, bands: [4, 3, 1, 0, -1, 0, 1.5, 3, 4, 3] },
      rock: { label: '摇滚能量', preamp: -2, bands: [3, 2, 1, -0.5, -1, 1.5, 2.5, 3, 2, 1] },
      classical: { label: '古典厅堂', preamp: -1, bands: [1.5, 1, 0.5, 0, -0.5, 0.5, 1.5, 2.5, 3, 2.5] },
      jazz: { label: '爵士平衡', preamp: -1.5, bands: [2, 1.5, 1, 0.5, 0, 0.5, 1.5, 2, 1.5, 1] },
      acoustic: { label: '原声细节', preamp: -1, bands: [1, 0.8, 0.5, 0, 0, 0.8, 1.8, 2.2, 1.8, 1.2] },
      dance: { label: '舞曲氛围', preamp: -2.5, bands: [5, 4, 2, 0, -1, 0.5, 2, 3.5, 4, 3] },
    };

    let eqSettings = {
      enabled: false,
      preset: 'flat',
      preamp: 0,
      bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    };

    let eqAudioContext = null;
    let eqSourceNode = null;
    let eqPreampNode = null;
    let eqOutputNode = null;
    let eqFilterNodes = [];
    let eqGraphInitialized = false;
    let eqSupportNoticeShown = false;
    const eqCorsProbeCache = new Map();

    function isCrossOriginUrl(url) {
      try {
        const parsed = new URL(url, window.location.href);
        return parsed.origin !== window.location.origin;
      } catch (error) {
        return false;
      }
    }

    async function probeEqUrlSupport(url) {
      if (!url) {
        return { ok: false, reason: '当前还没有可检测的音频地址' };
      }

      if (!isCrossOriginUrl(url)) {
        return { ok: true, reason: '' };
      }

      if (eqCorsProbeCache.has(url)) {
        return eqCorsProbeCache.get(url);
      }

      let result;
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          mode: 'cors',
          cache: 'no-store',
          credentials: 'omit'
        });
        result = { ok: true, reason: '', status: response.status };
      } catch (headError) {
        try {
          const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-store',
            credentials: 'omit',
            headers: { Range: 'bytes=0-0' }
          });
          result = { ok: true, reason: '', status: response.status };
        } catch (getError) {
          result = {
            ok: false,
            reason: '当前音源未开放浏览器可用的跨域音频处理权限，启用均衡器后会被浏览器静音。'
          };
        }
      }

      eqCorsProbeCache.set(url, result);
      return result;
    }

    async function canEnableEqForCurrentSource() {
      const sourceUrl = audioPlayer.currentSrc || audioPlayer.src || '';
      if (!sourceUrl) {
        return { ok: true, pending: true, reason: '' };
      }
      return probeEqUrlSupport(sourceUrl);
    }

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function dbToGain(db) {
      return Math.pow(10, db / 20);
    }

    function formatDbLabel(value) {
      const numeric = Number(value) || 0;
      const fixed = Math.abs(numeric % 1) < 1e-6 ? numeric.toFixed(0) : numeric.toFixed(1);
      return `${numeric > 0 ? '+' : ''}${fixed} dB`;
    }

    function normalizeEqSettings(raw = {}) {
      const preset = typeof raw.preset === 'string' ? raw.preset : 'flat';
      const bands = Array.isArray(raw.bands) ? raw.bands.slice(0, EQ_BANDS.length) : [];
      while (bands.length < EQ_BANDS.length) bands.push(0);
      return {
        enabled: !!raw.enabled,
        preset,
        preamp: clamp(Number.isFinite(Number(raw.preamp)) ? Number(raw.preamp) : 0, -12, 12),
        bands: bands.map(v => clamp(Number.isFinite(Number(v)) ? Number(v) : 0, -12, 12))
      };
    }

    async function ensureEqAudioGraph() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioPlayer.crossOrigin = 'anonymous';
      if (!AudioContextClass) {
        throw new Error('当前浏览器不支持 Web Audio API');
      }

      if (!eqAudioContext) {
        eqAudioContext = new AudioContextClass();
      }

      if (!eqGraphInitialized) {
        eqSourceNode = eqAudioContext.createMediaElementSource(audioPlayer);
        eqPreampNode = eqAudioContext.createGain();
        eqOutputNode = eqAudioContext.createGain();

        eqFilterNodes = EQ_BANDS.map((frequency, index) => {
          const filter = eqAudioContext.createBiquadFilter();
          filter.frequency.value = frequency;
          filter.gain.value = 0;
          if (index === 0) {
            filter.type = 'lowshelf';
            filter.Q.value = 0.8;
          } else if (index === EQ_BANDS.length - 1) {
            filter.type = 'highshelf';
            filter.Q.value = 0.8;
          } else {
            filter.type = 'peaking';
            filter.Q.value = 1.0;
          }
          return filter;
        });

        let chain = eqSourceNode;
        chain.connect(eqPreampNode);
        chain = eqPreampNode;
        eqFilterNodes.forEach(filter => {
          chain.connect(filter);
          chain = filter;
        });
        chain.connect(eqOutputNode);
        eqOutputNode.connect(eqAudioContext.destination);
        eqGraphInitialized = true;
      }

      if (eqAudioContext.state === 'suspended') {
        await eqAudioContext.resume();
      }
    }

    function saveEqSettings() {
      localStorage.setItem(EQ_STORAGE_KEY, JSON.stringify(eqSettings));
    }

    function updateEqStatusUi() {
      if (!eqStatusChip || !eqStatusText) return;
      eqStatusChip.classList.toggle('active', !!eqSettings.enabled);
      eqStatusText.textContent = eqSettings.enabled
        ? `已启用：${(EQ_PRESETS[eqSettings.preset]?.label) || '自定义'}`
        : '当前未启用';
    }

    function updateEqUi() {
      if (eqEnabledToggle) eqEnabledToggle.checked = !!eqSettings.enabled;
      if (eqPresetSelect) eqPresetSelect.value = eqSettings.preset;
      if (eqPreampSlider) eqPreampSlider.value = String(eqSettings.preamp);
      if (eqPreampValue) eqPreampValue.textContent = formatDbLabel(eqSettings.preamp);
      eqBandSliders.forEach((slider, index) => {
        slider.value = String(eqSettings.bands[index] ?? 0);
      });
      eqBandValueEls.forEach((el, index) => {
        el.textContent = formatDbLabel(eqSettings.bands[index] ?? 0);
      });
      updateEqStatusUi();
    }

    function applyEqToGraph() {
      if (!eqGraphInitialized || !eqPreampNode) return;
      const currentTime = eqAudioContext?.currentTime || 0;
      eqPreampNode.gain.setTargetAtTime(dbToGain(eqSettings.enabled ? eqSettings.preamp : 0), currentTime, 0.015);
      eqFilterNodes.forEach((filter, index) => {
        filter.gain.setTargetAtTime(eqSettings.enabled ? (eqSettings.bands[index] ?? 0) : 0, currentTime, 0.015);
      });
    }

    function persistAndRefreshEqUi() {
      eqSettings = normalizeEqSettings(eqSettings);
      saveEqSettings();
      updateEqUi();
      applyEqToGraph();
    }

    async function setEqEnabled(enabled, announce = true) {
      eqSettings.enabled = !!enabled;
      if (eqSettings.enabled) {
        const support = await canEnableEqForCurrentSource();
        if (!support.ok) {
          eqSettings.enabled = false;
          persistAndRefreshEqUi();
          showError(`当前音源不支持浏览器均衡器：${support.reason}`, 4200);
          return;
        }

        if (!support.pending) {
          try {
            await ensureEqAudioGraph();
          } catch (error) {
            console.error('初始化均衡器失败:', error);
            eqSettings.enabled = false;
            updateEqUi();
            showError(`均衡器不可用：${error.message}`, 3200);
            return;
          }
        }
      }
      persistAndRefreshEqUi();
      if (announce) {
        showDynamicIslandToast(eqSettings.enabled ? '均衡器已启用' : '均衡器已关闭', 2000);
      }
    }

    function applyEqPreset(presetKey, announce = true) {
      if (presetKey === 'custom') {
        eqSettings.preset = 'custom';
        persistAndRefreshEqUi();
        return;
      }
      const preset = EQ_PRESETS[presetKey] || EQ_PRESETS.flat;
      eqSettings.preset = presetKey in EQ_PRESETS ? presetKey : 'flat';
      eqSettings.preamp = preset.preamp;
      eqSettings.bands = [...preset.bands];
      persistAndRefreshEqUi();
      if (announce) {
        showDynamicIslandToast(`均衡器预设：${preset.label}`, 2200);
      }
    }

    function markEqAsCustom() {
      eqSettings.preset = 'custom';
      persistAndRefreshEqUi();
    }

    function loadEqSettings() {
      const saved = localStorage.getItem(EQ_STORAGE_KEY);
      if (saved) {
        try {
          eqSettings = normalizeEqSettings(JSON.parse(saved));
        } catch (error) {
          console.warn('均衡器配置读取失败，已回退默认值', error);
          eqSettings = normalizeEqSettings();
        }
      } else {
        eqSettings = normalizeEqSettings();
      }
      updateEqUi();
    }

    // ===== 实用函数 =====
    function clearError() {
      if (errorMessage) {
        errorMessage.classList.remove('active');
        errorMessage.textContent = '';
      }
    }

    function showError(msg, duration = 3000) {
      showDynamicIslandToast(msg, duration);
      if (isDynamicIslandExpanded) {
        toggleDynamicIsland();
      }
    }

    function isMobile() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    function initTheme() {
      const saved = localStorage.getItem('musicPlayerTheme') || 'dark';
      if (saved === 'light') {
        document.body.classList.add('light-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
      } else {
        document.body.classList.remove('light-theme');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
      }
    }

    function toggleTheme() {
      if (document.body.classList.contains('light-theme')) {
        document.body.classList.remove('light-theme');
        localStorage.setItem('musicPlayerTheme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
      } else {
        document.body.classList.add('light-theme');
        localStorage.setItem('musicPlayerTheme', 'light');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
      }
    }

    function updatePageTitle() {
      if (isPlaying && nowPlayingTitle.textContent && nowPlayingTitle.textContent !== '歌曲标题') {
        document.title = `正在为您播放：《${nowPlayingTitle.textContent}》`;
      } else {
        document.title = originalTitle;
      }
    }

    function formatTime(sec) {
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    function debounce(func, delay) {
      let timeout;
      return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
      };
    }

    function isPerformanceLyricsMode() {
      return lyricsAnimationMode === 'performance';
    }

    function isPreviewLyricsMode() {
      return lyricsAnimationMode === 'preview';
    }

    function normalizeLyricsRendererMode(mode) {
      return mode === 'legacy' ? 'legacy' : 'amll';
    }

    function isAMLLRendererMode() {
      return lyricsRendererMode !== 'legacy';
    }

    async function applyLyricsRendererMode(mode = 'amll', options = {}) {
      const { persist = true, toast = false, rerender = false } = options;
      const nextMode = normalizeLyricsRendererMode(mode);
      const changed = lyricsRendererMode !== nextMode;
      lyricsRendererMode = nextMode;

      document.body.classList.toggle('lyrics-renderer-amll', lyricsRendererMode === 'amll');
      document.body.classList.toggle('lyrics-renderer-legacy', lyricsRendererMode === 'legacy');
      lyricsRendererModeRadios.forEach(radio => {
        radio.checked = radio.value === lyricsRendererMode;
      });

      if (persist) {
        localStorage.setItem(LYRICS_RENDERER_MODE_KEY, lyricsRendererMode);
      }

      if (rerender && changed) {
        try {
          if (currentLyricRenderOptions?.hasRendered) {
            await renderAMLLLines(currentLyricRenderLines, {
              ...currentLyricRenderOptions,
              skipCache: true
            });
          } else if (currentSongData) {
            await requestLyricsOnlyForSong(currentSongData);
          }
          resizeAMLLPlayer();
        } catch (error) {
          console.warn('[歌词显示模式] 重新渲染失败:', error);
        }
      }

      if (toast && changed) {
        showDynamicIslandToast(
          lyricsRendererMode === 'amll' ? '已切换为 AMLL 歌词展示' : '已切换为原先默认歌词展示',
          2200
        );
      }
    }

    function applyPlayerControlsLayout(mode = 'classic', persist = true) {
      playerControlsLayout = mode === 'apple-music' ? 'apple-music' : 'classic';
      document.body.classList.toggle('player-layout-apple-music', playerControlsLayout === 'apple-music');
      document.body.classList.toggle('player-layout-classic', playerControlsLayout !== 'apple-music');

      document.querySelectorAll('input[name="playerControlsLayout"]').forEach(radio => {
        radio.checked = radio.value === playerControlsLayout;
      });

      if (persist) {
        localStorage.setItem(PLAYER_CONTROLS_LAYOUT_KEY, playerControlsLayout);
      }
    }

    function getLyricsItemTransition() {
      if (isPerformanceLyricsMode()) {
        return 'transform 0.18s ease-out, opacity 0.18s linear, color 0.18s linear';
      }
      if (isPreviewLyricsMode()) {
        return 'transform 0.8s cubic-bezier(0.15, 0, 0.15, 1), opacity 0.42s ease, color 0.42s ease, filter 0.42s ease';
      }
      return isMobile()
        ? 'transform 0.28s cubic-bezier(.2,.7,0,1), color 0.18s linear'
        : 'transform 0.7s cubic-bezier(.19,.11,0,1), color 0.5s ease-in-out, filter 0.5s ease-in-out';
    }

    function applyLyricsItemTransitions() {
      const items = amLyrics ? amLyrics.querySelectorAll('.item') : [];
      items.forEach(item => {
        item.style.transition = getLyricsItemTransition();
      });
    }

    function refreshCurrentLyricsAnimation() {
      if (!amLyricsData.length) return;
      const currentTime = audioPlayer.currentTime || 0;
      const previousLyric = lastLyric;
      lastLyric = -1;
      lastTitleLyricIndex = -1;
      updateAMLyricsHighlight(currentTime);
      if (lastLyric === -1) {
        const fallbackIndex = previousLyric >= 0 ? previousLyric : 0;
        lastLyric = previousLyric;
        UpdateLyricsLayout(fallbackIndex, [fallbackIndex], amLyricsData, 0);
      }
    }

    function applyLyricsAnimationMode(mode = 'visual', persist = true) {
      lyricsAnimationMode = mode === 'performance' ? 'performance' : (mode === 'preview' ? 'preview' : 'visual');
      document.body.classList.toggle('lyrics-performance-mode', lyricsAnimationMode === 'performance');
      document.body.classList.toggle('lyrics-preview-mode', lyricsAnimationMode === 'preview');
      document.body.classList.toggle('lyrics-visual-mode', lyricsAnimationMode === 'visual');

      document.querySelectorAll('input[name="lyricsAnimationMode"]').forEach(radio => {
        radio.checked = radio.value === lyricsAnimationMode;
      });

      if (persist) {
        localStorage.setItem(LYRICS_ANIMATION_MODE_KEY, lyricsAnimationMode);
      }

      applyLyricsItemTransitions();
      requestAnimationFrame(() => {
        if (amLyricsData.length) {
          rebuildLyricsMetrics(amLyricsData);
        }
        refreshCurrentLyricsAnimation();
      });
    }

    function getCollapsedIslandBaseWidth() {
      return window.innerWidth <= 768 ? 160 : 180;
    }

    function ensureDynamicIslandToastMeasurer() {
      if (dynamicIslandToastMeasurer) return dynamicIslandToastMeasurer;
      dynamicIslandToastMeasurer = document.createElement('span');
      dynamicIslandToastMeasurer.className = 'collapsed-text measure';
      document.body.appendChild(dynamicIslandToastMeasurer);
      return dynamicIslandToastMeasurer;
    }

    function setDynamicIslandCollapsedWidth(width) {
      if (!dynamicIsland || dynamicIsland.classList.contains('expanded')) return;
      const baseWidth = getCollapsedIslandBaseWidth();
      const maxWidth = Math.min(window.innerWidth - 24, 720);
      const finalWidth = Math.max(baseWidth, Math.min(Math.ceil(width), maxWidth));
      dynamicIsland.style.setProperty('--dynamic-island-collapsed-width', `${finalWidth}px`);
    }

    function measureDynamicIslandCollapsedWidth(message) {
      const measurer = ensureDynamicIslandToastMeasurer();
      measurer.textContent = message || '';
      return measurer.offsetWidth + 56;
    }

    function resetDynamicIslandCollapsedWidth(force = false) {
      if (!dynamicIsland) return;
      if (!force && dynamicIsland.classList.contains('expanded')) return;
      dynamicIsland.style.setProperty('--dynamic-island-collapsed-width', `${getCollapsedIslandBaseWidth()}px`);
    }

    function refreshDynamicIslandToastLayout() {
      if (!collapsedTextSpan || !collapsedTextSpan.dataset.toastActive) {
        resetDynamicIslandCollapsedWidth();
        return;
      }

      setDynamicIslandCollapsedWidth(measureDynamicIslandCollapsedWidth(collapsedTextSpan.textContent));
    }

    function hideDynamicIslandToast() {
      if (dynamicIslandToastTimer) {
        clearTimeout(dynamicIslandToastTimer);
        dynamicIslandToastTimer = null;
      }

      if (collapsedTextSpan) {
        delete collapsedTextSpan.dataset.toastActive;
        delete collapsedTextSpan.dataset.toastMessage;
      }

      if (currentPlayingId) {
        setCollapsedTextAnimated('正在播放', false, true);
      } else {
        setCollapsedTextAnimated('Harmonia', false, true);
      }

      resetDynamicIslandCollapsedWidth();
    }

    function showDynamicIslandToast(message, duration = 3000) {
      if (!collapsedTextSpan || !message) return;

      if (dynamicIslandToastTimer) {
        clearTimeout(dynamicIslandToastTimer);
        dynamicIslandToastTimer = null;
      }

      const originalText = collapsedTextSpan.textContent;
      const safeDuration = Number(duration) || 3000;

      collapsedTextSpan.dataset.toastActive = 'true';
      collapsedTextSpan.dataset.toastMessage = message;

      setCollapsedTextAnimated(message, false, true).then(() => {
        setDynamicIslandCollapsedWidth(measureDynamicIslandCollapsedWidth(message));
      });

      dynamicIslandToastTimer = setTimeout(() => {
        let restoreText = originalText;
        if (currentPlayingId && (!restoreText || restoreText === message)) {
          restoreText = '正在播放';
        } else if (!currentPlayingId && (!restoreText || restoreText === message)) {
          restoreText = 'Harmonia';
        }

        setCollapsedTextAnimated(restoreText, false, true).then(() => {
          if (collapsedTextSpan.dataset.toastMessage === message) {
            delete collapsedTextSpan.dataset.toastActive;
            delete collapsedTextSpan.dataset.toastMessage;
          }
          resetDynamicIslandCollapsedWidth();
          updateCollapsedTextByPlayingState();
        });
        dynamicIslandToastTimer = null;
      }, safeDuration);
    }

    /**
     * 显示 AMLL TTML 歌词请求失败重试弹窗
     * @param {string} message - 失败原因描述
     * @returns {Promise<boolean>} - true 表示用户选择重新请求，false 表示暂不请求
     */
    function showAMLLRetryDialog(message = '') {
      // 清理之前可能残留的弹窗状态
      const overlay = document.getElementById('amllRetryOverlay');
      const msgEl = document.getElementById('amllRetryMessage');
      const skipBtn = document.getElementById('amllRetrySkipBtn');
      const retryBtn = document.getElementById('amllRetryRetryBtn');

      if (!overlay || !skipBtn || !retryBtn) {
        console.warn('[AMLL] 重试弹窗元素缺失，自动跳过');
        return Promise.resolve(false);
      }

      // 先隐藏并重置状态
      overlay.style.display = 'none';
      retryBtn.disabled = false;
      retryBtn.textContent = '重新请求';

      return new Promise((resolve) => {
        // 更新消息
        if (msgEl && message) {
          msgEl.textContent = message;
        }

        // 清理旧的事件监听器（通过克隆节点）
        const newSkipBtn = skipBtn.cloneNode(true);
        const newRetryBtn = retryBtn.cloneNode(true);
        skipBtn.parentNode.replaceChild(newSkipBtn, skipBtn);
        retryBtn.parentNode.replaceChild(newRetryBtn, retryBtn);

        let resolved = false;

        const cleanup = () => {
          if (resolved) return;
          resolved = true;
          overlay.style.display = 'none';
          overlay._retryOverlayClickHandler && overlay.removeEventListener('click', overlay._retryOverlayClickHandler);
          overlay._retryOverlayClickHandler = null;
        };

        const handleSkip = () => {
          if (resolved) return;
          cleanup();
          resolve(false);
        };

        const handleRetry = () => {
          if (resolved) return;
          resolved = true;
          newRetryBtn.disabled = true;
          newRetryBtn.textContent = '请求中...';
          overlay.style.display = 'none';
          overlay._retryOverlayClickHandler && overlay.removeEventListener('click', overlay._retryOverlayClickHandler);
          overlay._retryOverlayClickHandler = null;
          resolve(true);
        };

        newSkipBtn.addEventListener('click', handleSkip);

        newRetryBtn.addEventListener('click', handleRetry);

        // 点击遮罩层关闭 = 暂不请求
        const overlayClickHandler = (e) => {
          if (e.target === overlay) {
            handleSkip();
          }
        };
        overlay._retryOverlayClickHandler = overlayClickHandler;
        overlay.addEventListener('click', overlayClickHandler);

        overlay.style.display = 'flex';
      });
    }

    function updateCollapsedText(text, skipAnimation = false) {
      setCollapsedTextAnimated(text, skipAnimation);
    }

    function updateCollapsedTextByPlayingState() {
      if (collapsedTextSpan?.dataset.toastActive) return;

      if (currentPlayingId) {
        setCollapsedTextAnimated('正在播放');
      } else {
        setCollapsedTextAnimated('Harmonia');
      }
    }

    function startRequest() {
      if (activeRequests === 0) {
        if (requestStatusTimeout) {
          clearTimeout(requestStatusTimeout);
          requestStatusTimeout = null;
        }
        if (dynamicIsland.classList.contains('expanded')) {
          dynamicIsland.classList.remove('expanded');
          isDynamicIslandExpanded = false;
        }
        if (!collapsedTextSpan?.dataset.toastActive) {
          setCollapsedTextAnimated('正在请求中');
        }
      }
      activeRequests++;
    }

    function endRequest(success) {
      activeRequests--;
      if (!success) {
        hasAnyRequestFailed = true;
        if (!hasShownFirstRequestFailure) {
          showFirstRequestFailureModal();
        }
      }
      if (activeRequests === 0) {
        const finalStatus = hasAnyRequestFailed ? '请求失败' : '请求成功';
        if (!collapsedTextSpan?.dataset.toastActive) {
          setCollapsedTextAnimated(finalStatus);
          if (requestStatusTimeout) clearTimeout(requestStatusTimeout);
          requestStatusTimeout = setTimeout(() => {
            updateCollapsedTextByPlayingState();
            requestStatusTimeout = null;
          }, 3000);
        }
        hasAnyRequestFailed = false;
      }
    }

    function showFirstRequestFailureModal() {
    if (hasShownFirstRequestFailure) return;

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed; top:0; left:0; width:100%; height:100%;
        background: rgba(0,0,0,0.7); display:flex; align-items:center;
        justify-content:center; z-index:2100; opacity:1; visibility:visible;
    `;

    const modalBox = document.createElement('div');
    modalBox.className = 'modal-content';
    modalBox.style.cssText = `
        background: var(--card-bg-dark); border-radius:28px; padding:28px;
        max-width:400px; width:90%; border:1px solid rgba(255,255,255,0.1);
        backdrop-filter: blur(26px); -webkit-backdrop-filter: blur(26px);
        box-shadow:0 20px 50px rgba(0,0,0,0.75);
        color: var(--text-dark); line-height:1.6;
    `;

    modalBox.innerHTML = `
        <h3 style="color:var(--primary-color); margin-top:0; margin-bottom:16px;">⚠️ 我们遇到了一些问题。</h3>
        <p style="margin:0 0 20px; font-size:15px;">
            Harmonia发现您的网络请求失败。您可以前往
            <a href="https://harmoniamusicplayer.dpdns.org/Q&A.html" style="color:var(--primary-color); text-decoration:underline;" target="_blank">Harmonia音乐播放器常见问题及处理方法</a>
            寻找解决方案。
        </p>
        <div style="text-align:right;">
            <button id="closeFailureModal" style="
                background:var(--primary-color); color:white; border:none;
                padding:10px 24px; border-radius:999px; font-weight:600;
                cursor:pointer;
            ">知道了</button>
        </div>
    `;

    modalOverlay.appendChild(modalBox);
    document.body.appendChild(modalOverlay);

    document.getElementById('closeFailureModal').addEventListener('click', () => {
        modalOverlay.remove();
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) modalOverlay.remove();
    });

    hasShownFirstRequestFailure = true;
}

    async function wrappedFetch(input, init) {
        startRequest();  // 全局请求计数器（用于灵动岛状态显示）
        let finalInit = init || {};
        // 请求超时 (默认 25 秒)
        const timeoutMs = finalInit.timeout || 25000;
        delete finalInit.timeout;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        finalInit.signal = finalInit.signal
          ? combineSignals(finalInit.signal, controller.signal)
          : controller.signal;
        if (typeof input === 'string' && input.includes('api-kugou')) {
            finalInit.credentials = 'include';
            finalInit.mode = 'cors';
            finalInit.cache = 'no-store';
            finalInit.headers = {
                ...(finalInit.headers || {}),
                'Accept': 'application/json',
            };
            // 主动检测 token 是否已过期（基于本地缓存时间戳）
            if (kugouToken && isKugouTokenExpired()) {
                clearTimeout(timeoutId);
                triggerKugouReLogin();
                endRequest(false);
                throw new Error('酷狗凭证已过期，请重新登录');
            }
        }
        try {
            const response = await fetch(input, finalInit);
            clearTimeout(timeoutId);
            if (input.includes('api-kugou')) {
                const cloned = response.clone();
                const data = await cloned.json().catch(() => null);
                if (data && (data.status === 152 || data.code === 152 || (data.msg && data.msg.includes('未登录')))) {
                    triggerKugouReLogin();  // 触发重新登录
                    endRequest(false);
                    throw new Error('酷狗凭证已失效，请重新登录');
                }
            }
            if (!response.ok) {
                endRequest(false);
            } else {
                endRequest(true);
            }
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            endRequest(false);
            throw error;
        }
    }
    function combineSignals(s1, s2) {
      if (s1.aborted || s2.aborted) return AbortSignal.abort();
      const c = new AbortController();
      s1.addEventListener('abort', () => c.abort(s1.reason), { once: true });
      s2.addEventListener('abort', () => c.abort(s2.reason), { once: true });
      return c.signal;
    }

    // ===== 歌词切换功能 =====
    function toggleLyrics() {
      if (isMobile()) {
        if (!lyricsVisible || isMobileLyricsFullscreen) {
          toggleMobileLyricsFullscreen();
        } else {
          lyricsVisible = false;
          rightcontent.classList.add('hidden');
          toggleMobileLyricsFullscreen();
        }
        if (typeof window.__syncLyricsToolbar === 'function') window.__syncLyricsToolbar();
      } else {
        lyricsVisible = !lyricsVisible;
        if (lyricsVisible) {
          document.body.classList.remove('lyrics-closed');
          rightcontent.classList.remove('hidden');
          if (lyricsToggleBtn) lyricsToggleBtn.innerHTML = '<i class="fas fa-align-left"></i>';

          LYRICS_OFFSET = calculateLyricsOffset();
          if (amLyricsData.length > 0 && lastLyric >= 0) {
            UpdateLyricsLayout(lastLyric, [lastLyric], amLyricsData, 0);
          }
          resizeAMLLPlayer();
        } else {
          document.body.classList.add('lyrics-closed');
          if (lyricsToggleBtn) lyricsToggleBtn.innerHTML = '<i class="fas fa-times"></i>';
        }
        if (typeof window.__syncLyricsToolbar === 'function') window.__syncLyricsToolbar();
      }
    }

    function toggleMobileLyricsFullscreen() {
      isMobileLyricsFullscreen = !isMobileLyricsFullscreen;
      lyricsVisible = isMobileLyricsFullscreen;

      if (isMobileLyricsFullscreen) {
        // 先立即切换界面，避免移动端在大量歌词测量/AMLL 同步时卡住几秒。
        document.body.classList.add('mobile-lyrics-fullscreen');
        rightcontent.classList.remove('hidden');
        if (lyricsToggleBtn) {
          lyricsToggleBtn.innerHTML = '<i class="fas fa-times"></i>';
          lyricsToggleBtn.style.background = 'rgba(255, 45, 85, 0.8)';
          lyricsToggleBtn.style.color = 'white';
        }
        if (dynamicIsland) dynamicIsland.style.zIndex = '1001';
      } else {
        document.body.classList.remove('mobile-lyrics-fullscreen');
        rightcontent.classList.add('hidden');
        if (lyricsToggleBtn) {
          lyricsToggleBtn.innerHTML = '<i class="fas fa-align-left"></i>';
          lyricsToggleBtn.style.background = '';
          lyricsToggleBtn.style.color = '';
        }
      }

      const syncLyricsAfterPaint = () => {
        LYRICS_OFFSET = calculateLyricsOffset();
        if (isAMLLRendererMode() && amllPlayer && amllActive) {
          resizeAMLLPlayer();
          return;
        }
        if (amLyricsData.length > 0) {
          rebuildLyricsMetrics(amLyricsData);
          if (lastLyric >= 0) {
            UpdateLyricsLayout(lastLyric, [lastLyric], amLyricsData, 0);
          }
        }
        resizeAMLLPlayer();
      };

      requestAnimationFrame(() => setTimeout(syncLyricsAfterPaint, 0));
    }

    function loadTranslationSettings() {
      const savedTrans = localStorage.getItem('translationSettings');
      if (savedTrans) {
        try {
          translationSettings = JSON.parse(savedTrans);
          enableTranslation.checked = !!translationSettings.enabled;
          apiTokenInput.value = translationSettings.apiToken || '';
          const scopeRadio = document.querySelector(
            `input[name="translationScope"][value="${translationSettings.scope}"]`
          );
          if (scopeRadio) scopeRadio.checked = true;
        } catch {}
      }

      const savedLyrics = localStorage.getItem('lyricsSettings');
      if (savedLyrics) {
        try {
          lyricsSettings = { ...lyricsSettings, ...JSON.parse(savedLyrics) };
        } catch {}
      }
      if (typeof lyricsSettings.wordLyricsJumpEnabled !== 'boolean') {
        lyricsSettings.wordLyricsJumpEnabled = true;
      }

      applyLyricsRendererMode(localStorage.getItem(LYRICS_RENDERER_MODE_KEY) || 'amll', {
        persist: false,
        toast: false,
        rerender: false
      });

      if (isMobile()) {
        lyricsVisible = false;
        rightcontent.classList.add('hidden');
        if (lyricsToggleBtn) lyricsToggleBtn.innerHTML = '<i class="fas fa-align-left"></i>';
      }

      enableWordLyrics.checked = !!lyricsSettings.wordLyricsEnabled;
      if (enableWordLyricJump) {
        enableWordLyricJump.checked = lyricsSettings.wordLyricsJumpEnabled !== false;
      }
      applyWordLyricJumpSetting(lyricsSettings.wordLyricsJumpEnabled !== false, { persist: false, toast: false });
      neteaseProxyInput.value = lyricsSettings.neteaseProxy || '';
      const savedSource = localStorage.getItem('wordLyricsSource') || 'netease';
      const radios = document.querySelectorAll('input[name="wordLyricsSource"]');
      radios.forEach(radio => {
          if (radio.value === savedSource) {
              radio.checked = true;
          }
      });

      const savedMusicSource = localStorage.getItem(MUSIC_SOURCE_KEY) || currentSettings.source || 'netease';
      applyMusicSource(savedMusicSource, { persist: false, toast: false });
      applyKugouAudioQuality(localStorage.getItem(KUGOU_QUALITY_KEY) || currentSettings.kugouQuality || '320', { persist: false, toast: false });
    }

    function saveTranslationSettings() {
      translationSettings.enabled = enableTranslation.checked;
      translationSettings.apiToken = apiTokenInput.value.trim();
      translationSettings.scope =
        document.querySelector('input[name="translationScope"]:checked')?.value ||
        'no-translation';

      localStorage.setItem(
        'translationSettings',
        JSON.stringify(translationSettings)
      );
      lyricsSettings.wordLyricsEnabled = !!enableWordLyrics.checked;
      lyricsSettings.wordLyricsJumpEnabled = enableWordLyricJump ? !!enableWordLyricJump.checked : true;
      lyricsSettings.neteaseProxy = neteaseProxyInput.value.trim();
      localStorage.setItem('lyricsSettings', JSON.stringify(lyricsSettings));
      const selectedLyricsRenderer = document.querySelector('input[name="lyricsRendererMode"]:checked')?.value || lyricsRendererMode;
      applyLyricsRendererMode(selectedLyricsRenderer, { persist: true, toast: false, rerender: false });
      const selectedMusicSource = document.querySelector('input[name="musicSource"]:checked')?.value || currentSettings.source;
      applyMusicSource(selectedMusicSource, { persist: true, toast: false });
      showDynamicIslandToast('设置已保存', 2500);
    }

    // ===== 桌面歌词功能 =====
    function connectDesktopLyrics() {
      if (isDesktopLyricsConnected && desktopLyricsWs?.readyState === WebSocket.OPEN) {
        disconnectDesktopLyrics();
        return;
      }

      try {
        desktopLyricsWs = new WebSocket('ws://localhost:8765');

        desktopLyricsWs.onopen = () => {
          isDesktopLyricsConnected = true;
          desktopLyricsRetryCount = 0;
          desktopLyricsBtn.innerHTML = '<i class="fas fa-desktop"></i> 断开连接';
          desktopLyricsBtn.style.background = 'var(--success-color)';
          showError('桌面歌词连接成功', 2000);
          sendCurrentSongToDesktop();
          sendCurrentLyricsToDesktop();
        };

        desktopLyricsWs.onclose = () => {
          isDesktopLyricsConnected = false;
          desktopLyricsBtn.innerHTML = '<i class="fas fa-desktop"></i> 桌面歌词';
          desktopLyricsBtn.style.background = '';

          if (desktopLyricsRetryCount < MAX_RETRY_COUNT && desktopLyricsRetryCount >= 0) {
            desktopLyricsRetryCount++;
            setTimeout(() => {
              showError(`桌面歌词断开，正在重连 (${desktopLyricsRetryCount}/${MAX_RETRY_COUNT})`, 2000);
              connectDesktopLyrics();
            }, 2000);
          }
        };

        desktopLyricsWs.onerror = (error) => {
          console.error('桌面歌词连接错误:', error);
          showError('桌面歌词连接失败，请确保桌面歌词程序已启动', 3000);
        };

      } catch (error) {
        console.error('创建WebSocket连接失败:', error);
        showError('无法创建桌面歌词连接', 3000);
      }
    }

    function disconnectDesktopLyrics() {
      desktopLyricsRetryCount = -1;

      if (desktopLyricsWs) {
        try {
          desktopLyricsWs.close();
        } catch (e) {
          console.error('关闭WebSocket连接失败:', e);
        }
        desktopLyricsWs = null;
      }

      isDesktopLyricsConnected = false;
      desktopLyricsBtn.innerHTML = '<i class="fas fa-desktop"></i> 桌面歌词';
      desktopLyricsBtn.style.background = '';
      showError('已断开桌面歌词连接', 2000);

      setTimeout(() => {
        desktopLyricsRetryCount = 0;
      }, 500);
    }

    function sendCurrentSongToDesktop() {
      if (!isDesktopLyricsConnected || !desktopLyricsWs) return;

      const songData = {
          type: 'song',
          song: currentSongInfo.name,        // 使用保存的歌曲名
          artist: currentSongInfo.artist,    // 使用保存的歌手名
          album: currentSongInfo.album       // 使用保存的专辑名
      };

      try {
          desktopLyricsWs.send(JSON.stringify(songData));
      } catch (error) {
          console.error('发送歌曲信息失败:', error);
      }
    }

        function sendCurrentLyricsToDesktop() {
          if (!isDesktopLyricsConnected || !desktopLyricsWs || desktopLyricsWs.readyState !== WebSocket.OPEN) {
            return;
          }

          const sortedLines = (currentLyricRenderLines || []).slice().sort((a, b) => a.startTime - b.startTime);
          const wordLines = sortedLines.map(line => ({
            startTime: line.startTime,
            endTime: line.endTime,
            text: lineTextFromAMLL(line),
            translatedLyric: line.translatedLyric || '',
            romanLyric: line.romanLyric || '',
            isBG: !!line.isBG,
            isDuet: !!line.isDuet,
            words: (line.words || []).map(w => ({
              startTime: w.startTime,
              endTime: w.endTime,
              word: w.word || ''
            }))
          }));

          const lyricData = {
            type: 'full_lyric',
            format: currentLyricFormat,
            lyric: rawLyricText || '',      // 原文 LRC（向后兼容）
            tlyric: rawTlyricText || '',     // 翻译 LRC（向后兼容）
            lines: wordLines                 // 结构化词级数据
          };

          try {
            desktopLyricsWs.send(JSON.stringify(lyricData));
          } catch (error) {
            console.error('发送歌词数据失败:', error);
          }
        }

    function sendCurrentTimeToDesktop(currentTime) {
      if (!isDesktopLyricsConnected || !desktopLyricsWs || desktopLyricsWs.readyState !== WebSocket.OPEN) return;

      const now = performance.now();
      if (now - lastDesktopLyricsSentAt < 120) return;
      lastDesktopLyricsSentAt = now;

      const timeData = {
        type: 'time',
        currentTime: currentTime
      };

      try {
        desktopLyricsWs.send(JSON.stringify(timeData));
      } catch (error) {
        console.error('发送时间信息失败:', error);
      }
    }

    // ===== 灵动岛功能 =====
    function toggleDynamicIsland() {
      if (isDynamicIslandExpanded) {
        dynamicIsland.classList.remove('expanded');
        isDynamicIslandExpanded = false;
        if (searchInput && document.activeElement === searchInput) {
          searchInput.blur();
        }
        if (collapsedTextSpan?.dataset.toastActive) {
          refreshDynamicIslandToastLayout();
        } else {
          resetDynamicIslandCollapsedWidth();
        }
      } else {
        resetDynamicIslandCollapsedWidth(true);
        dynamicIsland.classList.add('expanded');
        isDynamicIslandExpanded = true;
        searchInput.focus();
      }
    }

    function updateDynamicIslandWelcome() {
      const currentSong = nowPlayingTitle.textContent !== '歌曲标题' ? nowPlayingTitle.textContent : '无';
      dynamicIslandWelcome.textContent = `欢迎使用Harmonia！ 当前正在播放：${currentSong}`;
    }

    function handleDynamicIslandClick(e) {
      if (e.target.closest('#dynamicIslandClose') ||
          e.target.closest('#searchButton') ||
          e.target.closest('.island-search-input') ||
          e.target.closest('.island-result-item') ||
          e.target.closest('.island-result-action') ||
          e.target.closest('.island-page-btn')) {
        return;
      }

      toggleDynamicIsland();
    }

    function expandDynamicIsland() {
        if (!dynamicIsland.classList.contains('expanded')) {
            resetDynamicIslandCollapsedWidth(true);
            dynamicIsland.classList.add('expanded');
            isDynamicIslandExpanded = true;
            setTimeout(() => searchInput.focus(), 50);
        }
    }

    // ===== 侧拉抽屉功能 =====
    function openSidebar() {
      sidebar.classList.add('active');
      sidebarOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
      sidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }

    // ===== 播放列表管理 =====
    function initPlaylist() {
      currentActivePlaylist = getActivePlaylistArray();
      renderPlaylist();
      updatePlaylistOrder();
    }

    function getActivePlaylistArray() {
      if (currentTab === 'playlist') return playlist;
      if (currentTab === 'favorites') return favorites;
      if (currentTab === 'history') return history;
      return [];
    }

    function addToPlaylist(track) {
      const normalizedTrack = normalizeTrack(track, currentSettings.source);
      const exists = playlist.some(x => x.id === normalizedTrack.id && getSongSource(x) === getSongSource(normalizedTrack));
      if (!exists) {
        playlist.push(normalizedTrack);
        savePlaylist();
        updatePlaylistOrder(); // 更新顺序
        if (currentTab === 'playlist') renderPlaylist();
        showError('已添加到播放列表', 1500);
      } else {
        showError('歌曲已在播放列表中', 1500);
      }
    }

    function removeFromPlaylist(index) {
      const songToRemove = playlist[index];
      const isCurrentPlaying = currentPlayingId === songToRemove?.id;

      // 从选中集合中移除
      if (songToRemove?.id) {
        playlistSelected.delete(songToRemove.id);
      }

      if (isCurrentPlaying) {
        audioPlayer.pause();
        currentPlayingId = null;
        updateCollapsedTextByPlayingState();
        currentPlaylistIdx = -1;
        isPlaying = false;
        updatePageTitle();
      } else if (currentPlaylistIdx > index) {
        currentPlaylistIdx--;
      }

      playlist.splice(index, 1);
      savePlaylist();
      updatePlaylistOrder(); // 更新播放顺序

      if (isCurrentPlaying && playlist.length > 0) {
        const nextSongId = getNextSongId(songToRemove.id);
        if (nextSongId) {
          const nextSong = getSongById(nextSongId);
          if (nextSong) {
            setTimeout(() => playSong(nextSong, true), 500);
          }
        }
      }

      renderPlaylist();
    }

    function updateSidebarIndexCache() {
      sidebarIndexCache.playlist = new Map(playlist.map((item, index) => [item.id, index]));
      sidebarIndexCache.favorites = new Map(favorites.map((item, index) => [item.id, index]));
      sidebarIndexCache.history = new Map(history.map((item, index) => [item.id, index]));
    }

    function getSidebarSourceListByTab(tab = currentTab) {
      if (tab === 'favorites') return favorites;
      if (tab === 'history') return history;
      return playlist;
    }

    function getSidebarIndexMapByTab(tab = currentTab) {
      const sourceList = getSidebarSourceListByTab(tab);
      const cache = sidebarIndexCache[tab];
      if (!cache || cache.size !== sourceList.length) {
        updateSidebarIndexCache();
      }
      return sidebarIndexCache[tab] || new Map();
    }

    function syncPlaylistSelectionUi() {
      const visibleItems = Array.from(playlistItems.querySelectorAll('.sidebar-item'));
      const checkedCount = visibleItems.reduce((count, item) => {
        const id = item.dataset.id;
        const checkbox = item.querySelector('.playlist-checkbox');
        const checked = !!id && playlistSelected.has(id);
        item.classList.toggle('selected-for-remove', checked);
        if (checkbox) checkbox.checked = checked;
        return count + (checked ? 1 : 0);
      }, 0);

      const selectAllCheckbox = playlistItems.querySelector('#selectAllPlaylistCheckbox');
      if (selectAllCheckbox) {
        selectAllCheckbox.checked = visibleItems.length > 0 && checkedCount === visibleItems.length;
        selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < visibleItems.length;
      }

      const selectedHint = playlistItems.querySelector('#selectedCountHint');
      if (selectedHint) {
        selectedHint.textContent = playlistSelected.size > 0 ? `已选 ${playlistSelected.size} 首` : '点击歌曲进行选择';
      }
    }

    function togglePlaylistSelection(id, checked = null) {
      if (!id) return;
      const shouldSelect = checked === null ? !playlistSelected.has(id) : checked;
      if (shouldSelect) {
        playlistSelected.add(id);
      } else {
        playlistSelected.delete(id);
      }
      syncPlaylistSelectionUi();
      updateBatchRemoveButton();
    }

    function ensurePlaylistItemsDelegation() {
      if (playlistItemsClickBound) return;

      playlistItems.addEventListener('click', (e) => {
        // 全选框点击
        if (e.target.id === 'selectAllPlaylistCheckbox') {
          e.stopPropagation();
          if (!isPlaylistDeleteMode || currentTab !== 'playlist') return;
          const isChecked = e.target.checked;
          playlistItems.querySelectorAll('.sidebar-item').forEach(item => {
            const id = item.dataset.id;
            if (!id) return;
            if (isChecked) {
              playlistSelected.add(id);
            } else {
              playlistSelected.delete(id);
            }
          });
          syncPlaylistSelectionUi();
          updateBatchRemoveButton();
          return;
        }

        const sidebarItem = e.target.closest('.sidebar-item');
        if (!sidebarItem || !playlistItems.contains(sidebarItem)) return;

        if (e.target.closest('.drag-handle')) return;

        const actualIndex = parseInt(sidebarItem.dataset.index, 10);
        const id = sidebarItem.dataset.id;

        if (currentTab === 'playlist' && isPlaylistDeleteMode) {
          e.stopPropagation();
          togglePlaylistSelection(id);
          return;
        }

        if (e.target.closest('.remove-from-playlist')) {
          e.stopPropagation();
          if (actualIndex !== -1) {
            if (currentTab === 'playlist') {
              removeFromPlaylist(actualIndex);
            } else if (currentTab === 'favorites') {
              removeFromFavorites(actualIndex);
            } else if (currentTab === 'history') {
              removeFromHistory(actualIndex);
            }
          }
          return;
        }

        if (currentTab === 'playlist') {
          if (actualIndex !== -1) {
            playFromPlaylist(actualIndex);
            return;
          }

          const sourceItem = getSidebarSourceListByTab('playlist').find(track => track.id === id);
          if (sourceItem) {
            addToPlaylist(sourceItem);
            const newIndex = playlist.findIndex(track => track.id === id);
            if (newIndex !== -1) playFromPlaylist(newIndex);
          }
          return;
        }

        const sourceList = getSidebarSourceListByTab(currentTab);
        const sourceItem = (actualIndex >= 0 && actualIndex < sourceList.length)
          ? sourceList[actualIndex]
          : sourceList.find(track => track.id === id);
        if (sourceItem) {
          playTrackFromItem(sourceItem);
        }
      });

      playlistItemsClickBound = true;
    }

    function renderPlaylist() {
      ensurePlaylistItemsDelegation();
      updateSidebarIndexCache();
      playlistItems.innerHTML = '';
      let items = getActivePlaylistArray();
      const sourceIndexMap = getSidebarIndexMapByTab(currentTab);

      if (sidebarSearchQuery) {
        items = items.filter(item => {
          const name = (item.name || '').toLowerCase();
          const artist = Array.isArray(item.artist)
            ? item.artist.join(' ').toLowerCase()
            : (item.artist || '').toLowerCase();
          return name.includes(sidebarSearchQuery) || artist.includes(sidebarSearchQuery);
        });
      }

      if (sidebarSourceFilter) {
        items = items.filter(item => getSongSource(item) === sidebarSourceFilter);
      }

      if (sidebarSortMode === 'az') {
        items.sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
        if (currentTab === 'playlist') {
          playlistOrder = items.map(item => item.id);
        }
      } else if (sidebarSortMode === 'za') {
        items.sort((a, b) => (b.name || '').toLowerCase().localeCompare((a.name || '').toLowerCase()));
        if (currentTab === 'playlist') {
          playlistOrder = items.map(item => item.id);
        }
      } else if (sidebarSortMode === 'custom') {
        const listKey = currentTab;
        if (customOrder[listKey]) {
          const orderMap = new Map(customOrder[listKey].map((id, index) => [id, index]));
          items.sort((a, b) => (orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER));
        }
        if (currentTab === 'playlist') {
          playlistOrder = items.map(item => item.id);
        }
      }

      if (items.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.style.cssText = 'padding:15px;color:var(--text-muted-dark);text-align:center;font-style:italic;';
        emptyMsg.textContent = sidebarSearchQuery
          ? '未找到相关歌曲'
          : (currentTab === 'favorites' ? '收藏列表为空' : currentTab === 'history' ? '暂无播放历史' : '播放列表为空');
        playlistItems.appendChild(emptyMsg);
        // 列表为空时清除选中状态
        if (currentTab === 'playlist') {
          playlistSelected.clear();
          updateBatchRemoveButton();
        }
        return;
      }

      const fragment = document.createDocumentFragment();
      const isPlaylistTab = currentTab === 'playlist';

      // 播放列表标签页删除模式：添加全选栏
      if (isPlaylistTab && isPlaylistDeleteMode) {
        const selectAllRow = document.createElement('div');
        selectAllRow.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 12px 8px;margin-bottom:2px;';
        const selectAllLabel = document.createElement('label');
        selectAllLabel.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:rgba(255,255,255,0.4);';
        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.className = 'playlist-checkbox';
        selectAllCheckbox.id = 'selectAllPlaylistCheckbox';
        selectAllLabel.appendChild(selectAllCheckbox);
        selectAllLabel.appendChild(document.createTextNode('全选'));
        selectAllRow.appendChild(selectAllLabel);
        const selectedHint = document.createElement('span');
        selectedHint.style.cssText = 'margin-left:auto;font-size:11px;color:rgba(255,255,255,0.3);';
        selectedHint.id = 'selectedCountHint';
        selectedHint.textContent = playlistSelected.size > 0 ? `已选 ${playlistSelected.size} 首` : '点击歌曲进行选择';
        selectAllRow.appendChild(selectedHint);
        fragment.appendChild(selectAllRow);
      }

      items.forEach((item, displayIndex) => {
        const actualIndex = sourceIndexMap.get(item.id) ?? -1;
        const d = document.createElement('div');
        d.className = 'sidebar-item';
        if (sidebarSortMode === 'custom') {
          d.classList.add('draggable-item');
          d.draggable = true;
        }
        d.dataset.index = actualIndex;
        d.dataset.id = item.id;
        d.dataset.displayIndex = displayIndex;

        if (currentPlayingId && item.id === currentPlayingId && isPlaylistTab) {
          d.classList.add('active');
        }

        const artists = toArtistText(item.artist);
        const sourceBadge = getSourceBadgeHtml(item);
        const extra = currentTab === 'history'
          ? `<div class="sidebar-item-time" style="font-size:11px;color:rgba(255,255,255,0.25);margin-top:3px;">${formatDate(item.timestamp)}</div>`
          : '';
        const dragHandle = sidebarSortMode === 'custom'
          ? '<div class="drag-handle"><i class="fas fa-grip-vertical"></i></div>'
          : '';
        const isActive = currentPlayingId && item.id === currentPlayingId && isPlaylistTab;
        const playingIndicator = isActive
          ? '<div class="playing-indicator"><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div></div>'
          : '<div class="playing-indicator"><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div></div>';
        const progressBar = isActive
          ? '<div class="sidebar-item-progress"><div class="sidebar-item-progress-fill" id="sidebarItemProgressFill" style="width:0%"></div></div>'
          : '';

        const checkboxHtml = isPlaylistTab && isPlaylistDeleteMode
          ? `<input type="checkbox" class="playlist-checkbox" ${playlistSelected.has(item.id) ? 'checked' : ''} tabindex="-1" />`
          : '';

        d.innerHTML = `
          ${dragHandle}
          ${checkboxHtml}
          ${playingIndicator}
          <div class="sidebar-item-info">
            <div class="sidebar-item-title-row">
              <div class="sidebar-item-title">${escapeHtml(item.name || '未知歌曲')}</div>
              ${sourceBadge}
            </div>
            <div class="sidebar-item-artist">${escapeHtml(artists)}</div>
            ${progressBar}
            ${extra}
          </div>
          <button class="remove-from-playlist" data-id="${escapeHtml(String(item.id))}">×</button>
        `;

        fragment.appendChild(d);
      });

      playlistItems.appendChild(fragment);
      // 同步选择和按钮状态
      syncPlaylistSelectionUi();
      updateBatchRemoveButton();
    }

    // ===== 拖拽排序功能 =====
    function initDragAndDrop() {
      let draggedItem = null;
      let draggedIndex = -1;
      let dragStartY = 0;
      let isTouchDragging = false;
      let touchDraggedItem = null;
      let activeDraggableItems = [];

      const getDraggableItems = () => Array.from(playlistItems.querySelectorAll('.draggable-item'));
      const clearDragState = (items = activeDraggableItems) => {
        items.forEach(item => {
          item.classList.remove('drag-over', 'dragging');
          item.style.transform = '';
        });
      };

      playlistItems.addEventListener('dragstart', handleDragStart);
      playlistItems.addEventListener('dragover', handleDragOver);
      playlistItems.addEventListener('drop', handleDrop);
      playlistItems.addEventListener('dragend', handleDragEnd);
      playlistItems.addEventListener('dragenter', handleDragEnter);
      playlistItems.addEventListener('dragleave', handleDragLeave);
      playlistItems.addEventListener('touchstart', handleTouchStart, { passive: false });
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('touchcancel', handleTouchEnd);

      function handleDragStart(e) {
        if (sidebarSortMode !== 'custom') return;

        const item = e.target.closest('.draggable-item');
        if (!item) return;

        activeDraggableItems = getDraggableItems();
        draggedItem = item;
        draggedIndex = parseInt(item.dataset.displayIndex, 10);

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(draggedIndex));

        requestAnimationFrame(() => {
          item.classList.add('dragging');
        });
      }

      function handleDragOver(e) {
        if (sidebarSortMode !== 'custom' || !draggedItem) return;

        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const targetItem = e.target.closest('.draggable-item');
        if (!targetItem || targetItem === draggedItem) return false;

        const targetIndex = parseInt(targetItem.dataset.displayIndex, 10);
        targetItem.style.transform = draggedIndex < targetIndex ? 'translateY(-5px)' : 'translateY(5px)';
        targetItem.classList.add('drag-over');
        return false;
      }

      function handleDrop(e) {
        if (sidebarSortMode !== 'custom' || !draggedItem) return;

        e.preventDefault();
        e.stopPropagation();

        const dropTarget = e.target.closest('.draggable-item');
        if (!dropTarget || dropTarget === draggedItem) return false;

        const dropIndex = parseInt(dropTarget.dataset.displayIndex, 10);
        updateCustomOrder(draggedIndex, dropIndex);
        clearDragState();
        return false;
      }

      function handleDragEnd() {
        if (sidebarSortMode !== 'custom') return;
        clearDragState();
        draggedItem = null;
        draggedIndex = -1;
        activeDraggableItems = [];
      }

      function handleDragEnter(e) {
        if (sidebarSortMode !== 'custom' || !draggedItem) return;

        const targetItem = e.target.closest('.draggable-item');
        if (targetItem && targetItem !== draggedItem) {
          targetItem.classList.add('drag-over');
        }
      }

      function handleDragLeave(e) {
        if (sidebarSortMode !== 'custom') return;

        const targetItem = e.target.closest('.draggable-item');
        if (targetItem && targetItem !== draggedItem) {
          targetItem.classList.remove('drag-over');
          targetItem.style.transform = '';
        }
      }

      function handleTouchStart(e) {
        if (sidebarSortMode !== 'custom') return;

        const handle = e.target.closest('.drag-handle');
        if (!handle) return; // 必须触碰拖拽手柄才能拖动，防止影响正常滑动列表

        const item = e.target.closest('.draggable-item');
        if (!item) return;

        activeDraggableItems = getDraggableItems();
        const touch = e.touches[0];
        e.preventDefault();
        touchDraggedItem = item;
        dragStartY = touch.clientY;
        draggedIndex = parseInt(item.dataset.displayIndex, 10);
        isTouchDragging = true;

        touchDraggedItem.classList.add('dragging');
        touchDraggedItem.style.transform = 'translateY(0)';
      }

      function handleTouchMove(e) {
        if (!isTouchDragging || !touchDraggedItem) return;

        e.preventDefault();
        const touch = e.touches[0];
        const deltaY = touch.clientY - dragStartY;
        touchDraggedItem.style.transform = `translateY(${deltaY}px)`;

        const items = activeDraggableItems.length ? activeDraggableItems : getDraggableItems();
        const currentRect = touchDraggedItem.getBoundingClientRect();
        const currentCenterY = currentRect.top + currentRect.height / 2;

        items.forEach(item => {
          if (item === touchDraggedItem) return;
          const itemRect = item.getBoundingClientRect();
          const itemCenterY = itemRect.top + itemRect.height / 2;

          if (Math.abs(currentCenterY - itemCenterY) < itemRect.height / 2) {
            const targetIndex = parseInt(item.dataset.displayIndex, 10);
            item.classList.add('drag-over');
            item.style.transform = draggedIndex < targetIndex ? 'translateY(-5px)' : 'translateY(5px)';
          } else {
            item.classList.remove('drag-over');
            item.style.transform = '';
          }
        });
      }

      function handleTouchEnd(e) {
        if (!isTouchDragging || !touchDraggedItem) return;

        e.preventDefault();
        const items = activeDraggableItems.length ? activeDraggableItems : getDraggableItems();
        const currentRect = touchDraggedItem.getBoundingClientRect();
        const currentCenterY = currentRect.top + currentRect.height / 2;
        let dropIndex = draggedIndex;

        for (const item of items) {
          if (item === touchDraggedItem) continue;
          const itemRect = item.getBoundingClientRect();
          const itemCenterY = itemRect.top + itemRect.height / 2;
          if (Math.abs(currentCenterY - itemCenterY) < itemRect.height / 2) {
            dropIndex = parseInt(item.dataset.displayIndex, 10);
            break;
          }
        }

        if (dropIndex !== draggedIndex) {
          updateCustomOrder(draggedIndex, dropIndex);
        }

        clearDragState(items);
        isTouchDragging = false;
        touchDraggedItem = null;
        draggedIndex = -1;
        activeDraggableItems = [];
      }

      function updateCustomOrder(fromIndex, toIndex) {
        const listKey = currentTab;
        const currentList = getActivePlaylistArray();

        if (!customOrder[listKey]) {
          customOrder[listKey] = currentList.map(item => item.id);
        }

        const order = customOrder[listKey];
        if (fromIndex < 0 || fromIndex >= order.length || toIndex < 0 || toIndex >= order.length) {
          return;
        }

        const movedId = order[fromIndex];
        order.splice(fromIndex, 1);
        order.splice(toIndex, 0, movedId);

        localStorage.setItem('musicPlayerCustomOrder', JSON.stringify(customOrder));
        reorderActualList(listKey, order);

        if (currentPlayingId && currentTab === 'playlist') {
          const newIndex = playlist.findIndex(item => item.id === currentPlayingId);
          if (newIndex !== -1) {
            currentPlaylistIdx = newIndex;
          }
        }

        updatePlaylistOrder();
        renderPlaylist();
        showError('顺序已更新', 1000);
      }

      function reorderActualList(listKey, newOrder) {
        const orderMap = new Map(newOrder.map((id, index) => [id, index]));

        if (listKey === 'playlist') {
          playlist.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
          savePlaylist();
          updatePlaylistOrder();
        } else if (listKey === 'favorites') {
          favorites.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
          saveFavorites();
        } else if (listKey === 'history') {
          history.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
          saveHistory();
        }
      }
    }

    function formatDate(ts) {
      const d = new Date(ts);
      return `${d.toLocaleDateString()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    function savePlaylist() {
      localStorage.setItem('musicPlaylist', JSON.stringify(playlist));
      updatePlaylistOrder();
    }

    function saveFavorites() {
      localStorage.setItem('musicFavorites', JSON.stringify(favorites));
    }

    function saveHistory() {
      localStorage.setItem('musicHistory', JSON.stringify(history));
    }

    function addToPlaylist(track) {
      const normalizedTrack = normalizeTrack(track, currentSettings.source);
      const exists = playlist.some(x => x.id === normalizedTrack.id && getSongSource(x) === getSongSource(normalizedTrack));
      if (!exists) {
        playlist.push(normalizedTrack);
        savePlaylist();
        if (currentTab === 'playlist') renderPlaylist();
        showError('已添加到播放列表', 1500);
      } else {
        showError('歌曲已在播放列表中', 1500);
      }
    }

    function addToFavorites(track) {
      const normalizedTrack = normalizeTrack(track, currentSettings.source);
      const exists = favorites.some(x => x.id === normalizedTrack.id && getSongSource(x) === getSongSource(normalizedTrack));
      if (!exists) {
        favorites.push(normalizedTrack);
        saveFavorites();
        if (currentTab === 'favorites') renderPlaylist();
        showError('已添加到收藏', 1500);
        return true;
      } else {
        showError('歌曲已在收藏列表中', 1500);
        return false;
      }
    }

    function addToHistory(track) {
      const normalizedTrack = normalizeTrack(track, currentSettings.source);
      const existingIdx = history.findIndex(x => x.id === normalizedTrack.id && getSongSource(x) === getSongSource(normalizedTrack));
      if (existingIdx !== -1) {
        history.splice(existingIdx, 1);
      }
      history.unshift({
        ...normalizedTrack,
        timestamp: Date.now()
      });
      if (history.length > 50) history.pop();
      saveHistory();
      if (currentTab === 'history') renderPlaylist();
    }

    function removeFromFavorites(index) {
      favorites.splice(index, 1);
      saveFavorites();
      renderPlaylist();
    }

    function removeFromHistory(index) {
      history.splice(index, 1);
      saveHistory();
      renderPlaylist();
    }

    function removeFromPlaylist(index) {
      // 从选中集合中移除
      const songToRemove = playlist[index];
      if (songToRemove?.id) {
        playlistSelected.delete(songToRemove.id);
      }

      if (currentPlaylistIdx === index) {
        audioPlayer.pause();
        currentPlaylistIdx = -1;
        isPlaying = false;
        updatePageTitle();
      } else if (currentPlaylistIdx > index) {
        currentPlaylistIdx--;
      }
      playlist.splice(index, 1);
      savePlaylist();
      renderPlaylist();
    }

    function updateBatchRemoveButton() {
      if (!clearPlaylist) return;
      const count = playlistSelected.size;
      if (currentTab !== 'playlist') {
        // 在其他标签页，恢复为清空功能
        clearPlaylist.innerHTML = '<i class="fas fa-trash"></i> 清空列表';
        clearPlaylist.disabled = false;
        clearPlaylist.classList.remove('has-selection');
        return;
      }
      if (!isPlaylistDeleteMode) {
        clearPlaylist.innerHTML = '<i class="fas fa-trash"></i> 移除歌曲';
        clearPlaylist.disabled = playlist.length === 0;
        clearPlaylist.classList.remove('has-selection');
        return;
      }
      if (count > 0) {
        clearPlaylist.innerHTML = `<i class="fas fa-trash"></i> 移除选中 (${count})`;
        clearPlaylist.disabled = false;
        clearPlaylist.classList.add('has-selection');
      } else {
        clearPlaylist.innerHTML = '<i class="fas fa-times"></i> 退出移除';
        clearPlaylist.disabled = false;
        clearPlaylist.classList.remove('has-selection');
      }
    }

    function enterPlaylistDeleteMode() {
      if (currentTab !== 'playlist' || playlist.length === 0) return;
      isPlaylistDeleteMode = true;
      playlistSelected.clear();
      renderPlaylist();
      showError('已进入移除模式，点击歌曲即可选择', 1800);
    }

    function exitPlaylistDeleteMode() {
      isPlaylistDeleteMode = false;
      playlistSelected.clear();
      renderPlaylist();
    }

    function batchRemoveSelectedSongs() {
      if (currentTab !== 'playlist' || playlistSelected.size === 0) return;

      const count = playlistSelected.size;
      const idsToRemove = new Set(playlistSelected);

      // 创建确认对话框
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:2000;';
      const dialog = document.createElement('div');
      dialog.style.cssText = 'background:var(--card-bg-dark);border-radius:20px;padding:28px 24px 20px;max-width:380px;width:90%;text-align:center;display:flex;flex-direction:column;gap:16px;';
      dialog.innerHTML = `
        <div style="font-size:40px;color:var(--primary-color);margin-bottom:4px;"><i class="fas fa-exclamation-triangle"></i></div>
        <div style="font-size:17px;font-weight:600;color:var(--text-dark);">确认移除</div>
        <div style="font-size:14px;color:var(--text-muted-dark);line-height:1.6;">确定要移除选中的 <strong style="color:var(--primary-color);">${count}</strong> 首歌曲吗？<br><span style="font-size:12px;">此操作不可撤销</span></div>
        <div style="display:flex;gap:10px;margin-top:4px;">
          <button class="confirm-cancel-btn" style="flex:1;padding:12px;border-radius:12px;border:none;cursor:pointer;font-size:14px;font-weight:500;background:rgba(255,255,255,0.08);color:var(--text-dark);transition:all 0.15s;">取消</button>
          <button class="confirm-ok-btn" style="flex:1;padding:12px;border-radius:12px;border:none;cursor:pointer;font-size:14px;font-weight:600;background:var(--primary-gradient);color:white;transition:all 0.15s;">确定移除</button>
        </div>
      `;
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      const closeDialog = () => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.2s';
        setTimeout(() => overlay.remove(), 200);
      };

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeDialog();
      });

      dialog.querySelector('.confirm-cancel-btn').addEventListener('click', closeDialog);
      dialog.querySelector('.confirm-ok-btn').addEventListener('click', () => {
        closeDialog();

        // 批量移除
        const toRemove = [];
        let removedCurrent = false;
        for (let i = playlist.length - 1; i >= 0; i--) {
          if (idsToRemove.has(playlist[i].id)) {
            const isCurrent = currentPlayingId === playlist[i].id;
            if (isCurrent) removedCurrent = true;
            toRemove.push({ index: i, isCurrent });
            playlist.splice(i, 1);
            if (currentPlaylistIdx > i) {
              currentPlaylistIdx--;
            } else if (currentPlaylistIdx === i) {
              currentPlaylistIdx = -1;
            }
          }
        }

        // 更新自定义排序
        if (customOrder.playlist) {
          customOrder.playlist = customOrder.playlist.filter(id => !idsToRemove.has(id));
        }
        localStorage.setItem('musicPlayerCustomOrder', JSON.stringify(customOrder));

        savePlaylist();
        updatePlaylistOrder();
        playlistSelected.clear();
        isPlaylistDeleteMode = false;
        updateBatchRemoveButton();

        if (removedCurrent) {
          audioPlayer.pause();
          currentPlayingId = null;
          currentSongData = null;
          isPlaying = false;
          updateLyricsRerequestDialog();
          playButton.innerHTML = '<i class="fas fa-play"></i>';
          updatePageTitle();
          updateCollapsedTextByPlayingState();

          if (playlist.length > 0) {
            const nextSong = playlist[0];
            if (nextSong) {
              setTimeout(() => playSong(nextSong, true), 300);
            }
          }
        }

        renderPlaylist();
      });
    }

    function clearCurrentTabItems() {
        if (currentTab === 'playlist') {
            if (!isPlaylistDeleteMode) {
              enterPlaylistDeleteMode();
              return;
            }

            // 删除模式下：有选中则批量移除，没有选中则退出模式
            if (playlistSelected.size > 0) {
              batchRemoveSelectedSongs();
              return;
            }
            exitPlaylistDeleteMode();
            return;
        } else if (currentTab === 'favorites') {
            favorites = [];
            saveFavorites();
            delete customOrder.favorites;
        } else {
            history = [];
            saveHistory();
            delete customOrder.history;
        }

        localStorage.setItem('musicPlayerCustomOrder', JSON.stringify(customOrder));

        renderPlaylist();
    }

    function getCurrentPlayingSongName() {
      return currentSongInfo?.name || nowPlayingTitle?.textContent || '未知歌曲';
    }


    // ===== AMLL Apple Music-like Lyrics 集成 =====
    function setAMLLStatus(message = '', type = 'hidden') {
      if (!amllStatus) return;
      amllStatus.textContent = message || '';
      amllStatus.classList.toggle('hidden', !message || type === 'hidden');
      amllStatus.classList.toggle('error', type === 'error');
    }

    function resetLegacyLyricsRuntime() {
      amLyricsData = [];
      lastLyric = -1;
      lastTitleLyricIndex = -1;
      lastWordLyricTime = -1;
      lastWordLyricLineIndex = -1;
      pendingLyricsLayout = null;
      if (lyricsLayoutRAF) {
        cancelAnimationFrame(lyricsLayoutRAF);
        lyricsLayoutRAF = 0;
      }
      if (amllFrameRAF) {
        cancelAnimationFrame(amllFrameRAF);
        amllFrameRAF = 0;
      }
      amllLastFrameTime = -1;
      stopWordLyricLoop?.();
    }

    function startAMLLFrameLoop() {
      if (amllFrameRAF) return;
      amllLastFrameTime = -1;
      const tick = (frameTime) => {
        if (!amllPlayer || !amllActive) {
          amllFrameRAF = 0;
          amllLastFrameTime = -1;
          return;
        }
        // 歌词区域不可见时跳过更新，节省 CPU
        if (rightcontent.classList.contains('hidden') && !document.body.classList.contains('mobile-lyrics-fullscreen')) {
          amllFrameRAF = requestAnimationFrame(tick);
          return;
        }
        const delta = amllLastFrameTime === -1 ? 0 : frameTime - amllLastFrameTime;
        amllLastFrameTime = frameTime;
        if (!audioPlayer.paused && !audioPlayer.ended) {
          amllPlayer.setCurrentTime(Math.round((audioPlayer.currentTime || 0) * 1000));
        }
        amllPlayer.update(delta);
        if (isPlaying && Array.isArray(amLyricsData) && amLyricsData.length > 0) {
          const currentTime = audioPlayer.currentTime || 0;
          const activeIndex = findActiveLyricIndex(currentTime);
          if (activeIndex !== lastTitleLyricIndex) {
            lastTitleLyricIndex = activeIndex;
            const lyricText = activeIndex >= 0 && activeIndex < amLyricsData.length ? amLyricsData[activeIndex].text : '';
            if (lyricText && lyricText.trim() !== '') {
              document.title = lyricText;
            } else {
              updatePageTitle();
            }
          }
        }
        amllFrameRAF = requestAnimationFrame(tick);
      };
      amllFrameRAF = requestAnimationFrame(tick);
    }

    function syncAMLLCurrentTime(isSeeking = false) {
      if (!amllPlayer || !amllActive) return;
      const currentMs = Math.round((audioPlayer.currentTime || 0) * 1000);
      try {
        amllPlayer.setCurrentTime(currentMs, !!isSeeking);
        amllPlayer.update(0);
      } catch (error) {
        console.warn('[AMLL] 同步进度失败:', error);
      }
    }

    function resumeAMLLPlayer() {
      if (!amllPlayer) return;
      try {
        amllPlayer.resume();
        startAMLLFrameLoop();
      } catch (error) {
        console.warn('[AMLL] resume 失败:', error);
      }
    }

    function pauseAMLLPlayer() {
      if (!amllPlayer) return;
      try {
        amllPlayer.pause();
      } catch (error) {
        console.warn('[AMLL] pause 失败:', error);
      }
    }

    function resizeAMLLPlayer() {
      if (!amllPlayer || !amllActive) return;
      requestAnimationFrame(() => syncAMLLCurrentTime(true));
    }

    function getAMLLPlayerElement(player = amllPlayer) {
      if (!player) return null;
      if (typeof player.getElement === 'function') return player.getElement();
      return player.element || player.el || null;
    }

    function deactivateAMLLRenderer(options = {}) {
      const { clearLines = false } = options;
      amllActive = false;
      if (amllFrameRAF) {
        cancelAnimationFrame(amllFrameRAF);
        amllFrameRAF = 0;
      }
      amllLastFrameTime = -1;
      if (!amllPlayer) return;
      try {
        amllPlayer.pause?.();
        if (clearLines && typeof amllPlayer.setLyricLines === 'function') {
          amllPlayer.setLyricLines([]);
          amllPlayer.update?.(0);
        }
      } catch (error) {
        console.warn('[AMLL] 停用播放器失败:', error);
      }
    }

    async function ensureAMLLPlayer() {
      if (amllPlayer) {
        const existingElement = getAMLLPlayerElement(amllPlayer);
        if (existingElement && !amLyrics.contains(existingElement)) {
          amLyrics.innerHTML = '';
          amLyrics.classList.add('amll-player-host');
          amLyrics.appendChild(existingElement);
        }
        return amllPlayer;
      }
      if (amllPlayerReadyPromise) return amllPlayerReadyPromise;

      // 防止并发重试
      if (amllPlayerRetrying) {
        // 等待当前重试流程完成
        return new Promise((resolve, reject) => {
          const check = setInterval(() => {
            if (!amllPlayerRetrying) {
              clearInterval(check);
              ensureAMLLPlayer().then(resolve, reject);
            }
          }, 200);
        });
      }

      const attemptLoad = async () => {
        setAMLLStatus('正在加载 AMLL 歌词引擎…', 'loading');
        const [coreModule, lyricModule] = await Promise.all([
          import(AMLL_CORE_ESM_URL),
          import(AMLL_LYRIC_ESM_URL)
        ]);
        amllCoreModule = coreModule;
        amllLyricModule = lyricModule;
        const LyricPlayerCtor = coreModule.LyricPlayer || coreModule.DomLyricPlayer;
        if (!LyricPlayerCtor) throw new Error('AMLL Core 未导出 LyricPlayer');

        amLyrics.innerHTML = '';
        amLyrics.classList.add('amll-player-host');
        const player = new LyricPlayerCtor();
        const playerElement = player.getElement();
        playerElement.classList.add('harmonia-amll-player');
        amLyrics.appendChild(playerElement);

        if (typeof player.addEventListener === 'function') {
          player.addEventListener('line-click', (event) => {
            const lineObject = event?.line?.getLine?.() || event?.detail?.line?.getLine?.();
            if (!lineObject || typeof lineObject.startTime !== 'number') return;
            audioPlayer.currentTime = Math.max(0, lineObject.startTime / 1000);
            player.setCurrentTime(lineObject.startTime, true);
          });
        }

        amllPlayer = player;
        if (audioPlayer.paused || audioPlayer.ended) {
          pauseAMLLPlayer();
        } else {
          resumeAMLLPlayer();
        }
        startAMLLFrameLoop();
        setAMLLStatus('', 'hidden');
        return player;
      };

      // 重试循环：引擎加载失败时弹窗询问用户
      const maxRetries = 10;
      let attemptCount = 0;
      amllPlayerRetrying = true;

      try {
        while (attemptCount < maxRetries) {
          attemptCount++;
          amllPlayerReadyPromise = attemptLoad();

          try {
            const player = await amllPlayerReadyPromise;
            amllPlayerRetrying = false;
            return player;
          } catch (error) {
            lastAmlLError = error;
            amllPlayerReadyPromise = null;
            console.warn(`[AMLL] 歌词引擎加载失败 (第${attemptCount}次):`, error);

            // 显示重试弹窗
            const shouldRetry = await showAMLLRetryDialog(
              `AMLL 歌词引擎加载失败 (第${attemptCount}次)：可能是网络问题导致 ESM 模块加载失败。\n你可以选择重新请求加载引擎，或暂不请求使用兼容渲染模式。`
            );

            if (!shouldRetry) {
              // 用户选择暂不请求，抛出错误让调用方回退到兼容渲染
              amllPlayerRetrying = false;
              setAMLLStatus('AMLL 歌词引擎加载失败，已使用兼容渲染。', 'error');
              throw error;
            }
            // 用户选择重新请求，继续循环
          }
        }

        // 达到最大重试次数
        amllPlayerRetrying = false;
        setAMLLStatus('AMLL 歌词引擎多次加载失败，已使用兼容渲染。', 'error');
        throw lastAmlLError || new Error('AMLL 歌词引擎加载失败');
      } catch (e) {
        amllPlayerRetrying = false;
        throw e;
      }
    }

    function msFromSeconds(value, fallback = 0) {
      const num = Number(value);
      if (!Number.isFinite(num)) return fallback;
      return Math.max(0, Math.round(num * 1000));
    }

    function normalizeAMLLWord(word, fallbackStart, fallbackEnd) {
      const startTime = Number.isFinite(Number(word?.startTime))
        ? Math.round(Number(word.startTime))
        : (Number.isFinite(Number(word?.start)) ? msFromSeconds(word.start, fallbackStart) : fallbackStart);
      const endTime = Number.isFinite(Number(word?.endTime))
        ? Math.round(Number(word.endTime))
        : (Number.isFinite(Number(word?.end)) ? msFromSeconds(word.end, fallbackEnd) : fallbackEnd);
      return {
        startTime: Math.max(0, startTime),
        endTime: Math.max(Math.max(0, startTime) + 1, endTime),
        word: String(word?.word ?? word?.text ?? '')
      };
    }

    function getLyricWordText(word) {
      return String(word?.word ?? word?.text ?? '');
    }

    function joinLyricWordsPreservingSpaces(words) {
      return (Array.isArray(words) ? words : [])
        .map(getLyricWordText)
        .join('');
    }

    function wordsContainExplicitWhitespace(words) {
      return (Array.isArray(words) ? words : [])
        .some(word => /\s/.test(getLyricWordText(word)));
    }

    function shouldAddFallbackLatinSpaces(words) {
      if (!Array.isArray(words) || words.length <= 1) return false;
      if (wordsContainExplicitWhitespace(words)) return false;

      const fullText = joinLyricWordsPreservingSpaces(words);
      const hasLatin = /[a-zA-Z\u00C0-\u024F]/.test(fullText);
      const hasCJK = /[\u4e00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/.test(fullText);

      // 只有“纯拉丁词被拆成多个 token 且源文本没有任何空白”时才兜底补空格。
      // KRC/YRC 里的真实空格（包括单独的空格 token、单词尾部空格）必须原样保留，不能再二次补空格。
      return hasLatin && !hasCJK;
    }

    function addFallbackLatinSpaces(words) {
      return words.map((word, index) => {
        if (index === words.length - 1) return word;
        return { ...word, word: getLyricWordText(word) + ' ' };
      });
    }

    function normalizeAMLLLine(line, index = 0, allLines = []) {
      const startTime = Number.isFinite(Number(line?.startTime))
        ? Math.round(Number(line.startTime))
        : msFromSeconds(line?.time, 0);
      let endTime = Number.isFinite(Number(line?.endTime))
        ? Math.round(Number(line.endTime))
        : (Number.isFinite(Number(line?.end)) ? msFromSeconds(line.end, startTime + 3000) : 0);
      if (!endTime || endTime <= startTime) {
        const next = allLines[index + 1];
        const nextStart = Number.isFinite(Number(next?.startTime))
          ? Math.round(Number(next.startTime))
          : (Number.isFinite(Number(next?.time)) ? msFromSeconds(next.time, 0) : 0);
        endTime = nextStart > startTime ? nextStart : startTime + 5000;
      }
      let words = (Array.isArray(line?.words) ? line.words : [])
        .map(word => normalizeAMLLWord(word, startTime, endTime))
        .filter(word => word.word && word.endTime > word.startTime);
      if (!words.length) {
        const fallbackText = String(line?.text || line?.lyric || '').trim() || '♪';
        words = [{ startTime, endTime, word: fallbackText }];
      }
      
      // 只有非 TTML 行且源歌词本身没有任何空白时，才为纯拉丁逐词歌词兜底补空格。
      if (!line._fromTtml && shouldAddFallbackLatinSpaces(words)) {
        words = addFallbackLatinSpaces(words);
      }
      
      return {
        words,
        translatedLyric: String(line?.translatedLyric ?? line?.translation ?? ''),
        romanLyric: String(line?.romanLyric ?? ''),
        startTime,
        endTime: Math.max(endTime, words[words.length - 1]?.endTime || endTime),
        time: startTime / 1000,
        isBG: !!line?.isBG,
        isDuet: !!line?.isDuet,
        agent: String(line?.agent ?? ''),
        _fromTtml: line._fromTtml,
        text: lineTextFromAMLL({ words, _fromTtml: line._fromTtml })
      };
    }

    function normalizeAMLLLines(lines) {
      if (!Array.isArray(lines)) return [];
      return lines
        .map((line, index) => normalizeAMLLLine(line, index, lines))
        .filter(line => line.words.length && line.endTime > line.startTime)
        .sort((a, b) => a.startTime - b.startTime);
    }

    function lineTextFromAMLL(line) {
      if (!line || !line.words || line.words.length === 0) return '';
      
      // 对于 TTML 来源的行（音节拆分），直接拼接所有单词文本，不加空格
      if (line._fromTtml) {
        return line.words.map(w => w.word || '').join('');
      }
      
      // 原有逻辑（非 TTML 行）
      const words = line.words.map(w => w.word || '');
      if (words.length === 1) return words[0];
      const fullText = words.join('');
      const hasCJK = /[\u4e00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/.test(fullText);
      if (hasCJK) {
        return words.join('');
      } else {
        return words.join(' ');
      }
    }

    function formatLrcTime(ms) {
      const total = Math.max(0, Number(ms) || 0) / 1000;
      const minutes = Math.floor(total / 60);
      const seconds = Math.floor(total % 60);
      const centiseconds = Math.floor((total - Math.floor(total)) * 100);
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
    }

    function serializeAMLLLinesToLrc(lines, field = 'main') {
      return (lines || [])
        .map(line => {
          const text = field === 'translated'
            ? (line.translatedLyric || '')
            : lineTextFromAMLL(line);
          return text ? `[${formatLrcTime(line.startTime)}]${text}` : '';
        })
        .filter(Boolean)
        .join('\n');
    }

    function legacyWordLinesToAMLLLines(wordLines) {
      return normalizeAMLLLines((wordLines || []).map((line, index, arr) => {
        const next = arr[index + 1];
        const startTime = msFromSeconds(line.time, 0);
        const endTime = Number.isFinite(Number(line.end))
          ? msFromSeconds(line.end, startTime + 3000)
          : (next ? msFromSeconds(next.time, startTime + 3000) : startTime + 5000);
        let words = Array.isArray(line.words) && line.words.length
          ? line.words.map(word => ({
              startTime: msFromSeconds(word.start, startTime),
              endTime: msFromSeconds(word.end, endTime),
              word: word.text || word.word || ''
            }))
          : [{ startTime, endTime, word: line.text || '' }];
        if (shouldAddFallbackLatinSpaces(words)) {
          words = addFallbackLatinSpaces(words);
        }
        
        return {
          startTime,
          endTime,
          words,
          translatedLyric: line.translation || '',
          romanLyric: line.romanLyric || '',
          isBG: !!line.isBG,
          isDuet: !!line.isDuet
        };
      }));
    }

    function lrcResponseToAMLLLines(lyricResponse) {
      if (!lyricResponse || !lyricResponse.lyric) return [];
      const lyrics = parseLyrics(lyricResponse.lyric);
      const translations = parseLyrics(lyricResponse.tlyric || '');
      const lyricTimes = lyrics.map(line => line.time);
      const transTimes = translations.map(line => line.time);
      const mapping = alignMonotonicByTime(lyricTimes, transTimes, 0.6);

      return normalizeAMLLLines(lyrics.map((line, index) => {
        const startTime = msFromSeconds(line.time, 0);
        const next = lyrics[index + 1];
        const endTime = next ? msFromSeconds(next.time, startTime + 5000) : startTime + 5000;
        const translatedLyric = mapping[index] !== -1 ? (translations[mapping[index]]?.text || '') : '';
        return {
          startTime,
          endTime,
          words: [{ startTime, endTime, word: line.text }],
          translatedLyric
        };
      }));
    }

    function parseTTMLTimeToMs(value) {
      if (!value) return NaN;
      const str = String(value).trim();
      // TTML 数据库里既会出现 00:10.376 / 1:02.330，也会出现 4.440 这种“裸秒数”。
      // 旧逻辑没有识别裸秒数，导致 1:02 之前使用 4.440、7.040 等格式的歌词行被整体丢弃。
      const plainSeconds = str.match(/^\d+(?:\.\d+)?$/);
      if (plainSeconds) return Math.round(parseFloat(str) * 1000);
      const clock = str.match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:\.(\d+))?$/);
      if (clock) {
        const h = parseInt(clock[1] || '0', 10);
        const m = parseInt(clock[2] || '0', 10);
        const sec = parseInt(clock[3] || '0', 10);
        const frac = clock[4] ? parseFloat('0.' + clock[4]) : 0;
        return Math.round((h * 3600 + m * 60 + sec + frac) * 1000);
      }
      const unit = str.match(/^([\d.]+)\s*(ms|s|m|h)$/i);
      if (unit) {
        const n = parseFloat(unit[1]);
        const u = unit[2].toLowerCase();
        if (u === 'ms') return Math.round(n);
        if (u === 's') return Math.round(n * 1000);
        if (u === 'm') return Math.round(n * 60000);
        if (u === 'h') return Math.round(n * 3600000);
      }
      return NaN;
    }

    function simpleTTMLToAMLLLines(ttmlContent) {
      const doc = new DOMParser().parseFromString(ttmlContent, 'application/xml');
      if (doc.querySelector('parsererror')) return [];

      const TTML_METADATA_NS = 'http://www.w3.org/ns/ttml#metadata';
      const XML_NS = 'http://www.w3.org/XML/1998/namespace';
      const getAttr = (el, name) => {
        if (!el?.getAttribute) return '';
        return el.getAttribute(name) || el.getAttribute(name.replace(/^.*:/, '')) || '';
      };
      const getRole = (el) => String(
        getAttr(el, 'ttm:role') ||
        el?.getAttributeNS?.(TTML_METADATA_NS, 'role') ||
        getAttr(el, 'role') ||
        ''
      ).toLowerCase();
      const getLang = (el) => String(
        getAttr(el, 'xml:lang') ||
        el?.getAttributeNS?.(XML_NS, 'lang') ||
        getAttr(el, 'lang') ||
        ''
      );
      const localNameOf = (node) => String(node?.localName || node?.nodeName || '')
        .toLowerCase()
        .replace(/^.*:/, '');
      const isElementNamed = (node, name) => node?.nodeType === 1 && localNameOf(node) === name;
      const getAgentId = (el) => String(
        getAttr(el, 'ttm:agent') ||
        el?.getAttributeNS?.(TTML_METADATA_NS, 'agent') ||
        getAttr(el, 'agent') ||
        ''
      );
      let agentElements = [];
      if (doc.getElementsByTagNameNS) {
        agentElements = Array.from(doc.getElementsByTagNameNS('*', 'agent'));
      }
      if (!agentElements.length) {
        agentElements = [
          ...Array.from(doc.getElementsByTagName('ttm:agent')),
          ...Array.from(doc.getElementsByTagName('agent'))
        ];
      }
      const agentMeta = new Map();
      for (const agentEl of agentElements) {
        const id = getAttr(agentEl, 'xml:id') || agentEl?.getAttributeNS?.(XML_NS, 'id') || getAttr(agentEl, 'id');
        if (!id) continue;
        agentMeta.set(id, {
          type: String(getAttr(agentEl, 'type') || '').toLowerCase(),
          role: getRole(agentEl)
        });
      }
      const primaryAgentId = Array.from(agentMeta.entries())
        .find(([, meta]) => meta.type !== 'other' && !meta.role.includes('other') && !meta.role.includes('background'))?.[0]
        || Array.from(agentMeta.keys())[0]
        || '';
      const isSecondaryAgent = (agentId) => {
        if (!agentId) return false;
        const meta = agentMeta.get(agentId) || {};
        return agentId !== primaryAgentId || meta.type === 'other' || meta.role.includes('other') || meta.role.includes('duet');
      };
      const normalizeLangTag = (lang) => String(lang || '')
        .trim()
        .replace(/_/g, '-')
        .toLowerCase();
      const hasHanText = (text) => /[\u3400-\u9FFF\uF900-\uFAFF]/.test(String(text || ''));
      const chineseTranslationPriority = (lang, text) => {
        const normalized = normalizeLangTag(lang);
        // 简中用户优先：zh-CN / zh-Hans / 大陆及常见简中地区。
        if (/^zh-(cn|hans|sg|my)(?:-|$)/.test(normalized)) return 0;
        // 有些 TTML 只写 zh，不写地区；它仍然是中文，作为次优选择。
        if (normalized === 'zh') return 1;
        // 如果只有繁中，宁可显示中文也不要回退到其他外语。
        if (/^zh-(tw|hk|mo|hant)(?:-|$)/.test(normalized)) return 2;
        // 极少数源可能没写 xml:lang，但文本明显是中文。
        if (!normalized && hasHanText(text)) return 3;
        return 99;
      };
      const cleanTranslationText = (text) => String(text || '')
        .replace(/\s+/g, ' ')
        .trim();
      const isTranslationSpan = (span) => {
        const role = getRole(span);
        const lang = getLang(span);
        return role.includes('translation') || (!!lang && !getAttr(span, 'begin') && !getAttr(span, 'end'));
      };
      const isRomanSpan = (span) => {
        const role = getRole(span);
        return role.includes('roman') || role.includes('romaji') || role.includes('pronunciation') || role.includes('transliteration');
      };
      const isBackgroundSpan = (span) => {
        const role = getRole(span);
        return role.includes('x-bg') || role === 'bg' || role.includes('background');
      };
      const appendBoundarySpace = (words, rawText) => {
        if (!words.length || !/\s/.test(rawText || '')) return;
        const last = words[words.length - 1];
        if (last && !/\s$/.test(last.word || '')) last.word += ' ';
      };
      const directTextOf = (el) => Array.from(el?.childNodes || [])
        .filter(node => node.nodeType === 3)
        .map(node => node.nodeValue || '')
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
      const directTimedTextOf = (el) => Array.from(el?.childNodes || [])
        .filter(node => node.nodeType === 3)
        .map(node => node.nodeValue || '')
        .join('');
      const normalizeTTMLTimedWordText = (text) => String(text || '')
        // 定时歌词 span 自身可能携带真实尾随空格，例如 <span>Could </span><span>you </span>。
        // 这里不能 trim()，否则会把英文单词之间的空格删掉；只去掉开头空白，避免缩进/换行污染。
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/ {2,}/g, ' ')
        .replace(/^\s+/, '');
      const collectDirectTranslations = (container) => {
        const candidates = Array.from(container?.childNodes || [])
          .filter(node => isElementNamed(node, 'span') && isTranslationSpan(node))
          .map((node, index) => {
            const text = cleanTranslationText(node.textContent || '');
            const lang = getLang(node);
            return { text, lang, priority: chineseTranslationPriority(lang, text), index };
          })
          .filter(item => item.text && item.priority < 99);
        if (!candidates.length) return '';
        candidates.sort((a, b) => a.priority - b.priority || a.index - b.index);
        return candidates[0].text;
      };
      const collectDirectRomanizations = (container) => Array.from(container?.childNodes || [])
        .filter(node => isElementNamed(node, 'span') && isRomanSpan(node))
        .map(node => cleanTranslationText(node.textContent || ''))
        .filter(Boolean)
        .join(' / ');
      const collectFallbackText = (container) => Array.from(container?.childNodes || [])
        .map(node => {
          if (node.nodeType === 3) return node.nodeValue || '';
          if (!isElementNamed(node, 'span')) return '';
          if (isTranslationSpan(node) || isRomanSpan(node) || isBackgroundSpan(node)) return '';
          return directTextOf(node) || cleanTranslationText(node.textContent || '');
        })
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
      const collectTimedWords = (container, fallbackStart, fallbackEnd) => {
        const words = [];
        for (const node of Array.from(container?.childNodes || [])) {
          if (node.nodeType === 3) {
            // TTML 中两个 <span> 之间存在文本空白时，代表真实单词边界；
            // 相邻 <span> 无空白时，通常是同一个单词的音节拆分（如 mun + da + ni + ty）。
            appendBoundarySpace(words, node.nodeValue || '');
            continue;
          }
          if (!isElementNamed(node, 'span')) continue;
          if (isTranslationSpan(node) || isRomanSpan(node) || isBackgroundSpan(node)) continue;

          const wStart = parseTTMLTimeToMs(getAttr(node, 'begin'));
          const wEnd = parseTTMLTimeToMs(getAttr(node, 'end'));
          const rawTimedText = directTimedTextOf(node) || (node.textContent || '');
          const wordText = normalizeTTMLTimedWordText(rawTimedText);
          if (!wordText || !wordText.trim()) continue;
          const start = Number.isFinite(wStart) ? wStart : fallbackStart;
          const end = Number.isFinite(wEnd)
            ? wEnd
            : (Number.isFinite(fallbackEnd) && fallbackEnd > start ? fallbackEnd : start + 3000);
          words.push({
            startTime: start,
            endTime: Math.max(start + 1, end),
            word: wordText
          });
        }
        return words;
      };
      const makeLine = (container, parentStart, parentEnd, options = {}) => {
        const begin = getAttr(container, 'begin') || getAttr(container, 'data-begin');
        const end = getAttr(container, 'end') || getAttr(container, 'data-end');
        const parsedStart = parseTTMLTimeToMs(begin);
        const parsedEnd = parseTTMLTimeToMs(end);
        const startTime = Number.isFinite(parsedStart) ? parsedStart : parentStart;
        let endTime = Number.isFinite(parsedEnd) ? parsedEnd : parentEnd;
        if (!Number.isFinite(startTime)) return null;

        const words = collectTimedWords(container, startTime, endTime);
        if (!Number.isFinite(endTime) || endTime <= startTime) {
          endTime = words.length ? Math.max(...words.map(w => w.endTime)) : startTime + 5000;
        }
        const fallbackText = collectFallbackText(container);
        return {
          startTime,
          endTime,
          words: words.length ? words : [{ startTime, endTime, word: fallbackText || '♪' }],
          translatedLyric: collectDirectTranslations(container),
          romanLyric: collectDirectRomanizations(container),
          isBG: !!options.isBG,
          isDuet: !!options.isDuet,
          agent: options.agent || getAgentId(container) || '',
          _fromTtml: true
        };
      };

      let paragraphs = [];
      if (doc.getElementsByTagNameNS) {
        paragraphs = Array.from(doc.getElementsByTagNameNS('*', 'p'));
      }
      if (!paragraphs.length) paragraphs = Array.from(doc.getElementsByTagName('p'));

      const lines = [];
      for (const p of paragraphs) {
        const agentId = getAgentId(p);
        const songPart = getAttr(p, 'itunes:song-part') || getAttr(p, 'song-part') || '';
        const isDuet = /duet|right/i.test(songPart) || isSecondaryAgent(agentId);
        const mainLine = makeLine(p, NaN, NaN, { isDuet, agent: agentId });
        if (mainLine) lines.push(mainLine);

        for (const bgSpan of Array.from(p.childNodes || []).filter(node => isElementNamed(node, 'span') && isBackgroundSpan(node))) {
          const bgLine = makeLine(bgSpan, mainLine?.startTime ?? NaN, mainLine?.endTime ?? NaN, { isBG: true, isDuet, agent: agentId });
          if (bgLine) lines.push(bgLine);
        }
      }
      return normalizeAMLLLines(lines);
    }

    function parseTTMLContentToAMLLLines(ttmlContent) {
      // 优先使用本地解析：它会读取 <span> 之间是否真的存在空白，
      // 因而能把 “your”+“self” / “mun”+“da”+“ni”+“ty” 合并显示，
      // 同时保留 “Don't ”、“lose ” 这类真实单词边界。
      const locallyParsed = simpleTTMLToAMLLLines(ttmlContent);
      if (locallyParsed.length) return locallyParsed;

      if (amllLyricModule?.parseTTML) {
        try {
          const parsed = amllLyricModule.parseTTML(ttmlContent);
          const parsedLines = parsed?.lines || parsed?.lyricLines || [];
          const markedLines = parsedLines.map(line => ({ ...line, _fromTtml: true }));
          const normalized = normalizeAMLLLines(markedLines);
          if (normalized.length) return normalized;
        } catch (error) {
          console.warn('[AMLL] parseTTML 失败:', error);
        }
      }
      return [];
    }

    async function renderAMLLLines(lines, options = {}) {
      lines = ensureWordSpacingForForeignLyrics(lines);
      const normalizedLines = normalizeAMLLLines(lines);
      rawLyricText = options.rawLyricText ?? serializeAMLLLinesToLrc(normalizedLines, 'main');
      rawTlyricText = options.rawTlyricText ?? serializeAMLLLinesToLrc(normalizedLines, 'translated');

      const src = options.source || '';
      if (/ttml/i.test(src))            currentLyricFormat = TTML;
      else if (/yrc/i.test(src))        currentLyricFormat = YRC;
      else if (/qrc/i.test(src))        currentLyricFormat = QRC;
      else if (/krc/i.test(src))        currentLyricFormat = KRC;
      else                              currentLyricFormat = LRC;

      if (!options.skipCache) {
        currentLyricRenderLines = normalizedLines;
        currentLyricRenderOptions = {
          ...options,
          rawLyricText,
          rawTlyricText,
          emptyText: options.emptyText || '暂无歌词',
          hasRendered: true
        };
      }

      resetLegacyLyricsRuntime();

      if (!isAMLLRendererMode()) {
        deactivateAMLLRenderer({ clearLines: true });
        setAMLLStatus('', 'hidden');
        if (!normalizedLines.length) {
          renderLegacyNoLyrics(options.emptyText || '暂无歌词');
          return false;
        }
        renderLegacyLyricLines(normalizedLines, options.emptyText || '暂无歌词');
        updatePageTitle();
        return true;
      }

      if (!normalizedLines.length) {
        amllActive = false;
        setAMLLStatus(options.emptyText || '暂无歌词', 'empty');
        try {
          const player = await ensureAMLLPlayer();
          player.setLyricLines([]);
          player.update(0);
        } catch (error) {
          renderLegacyNoLyrics(options.emptyText || '暂无歌词');
        }
        return false;
      }

      try {
        const player = await ensureAMLLPlayer();
        const currentMs = Math.round((audioPlayer.currentTime || 0) * 1000);
        // 根据翻译开关过滤 AMLL 行数据
        const lines = translationSettings.enabled
          ? normalizedLines
          : normalizedLines.map(l => ({ ...l, translatedLyric: '', romanLyric: '' }));
        player.setLyricLines(lines, currentMs);
        player.setCurrentTime(currentMs, true);
        player.update(0);
        if (audioPlayer.paused || audioPlayer.ended) { pauseAMLLPlayer(); } else { resumeAMLLPlayer(); }
        startAMLLFrameLoop();
        amllActive = true;
        setAMLLStatus('', 'hidden');
        amLyricsData = normalizedLines;
        updatePageTitle();
        return true;
      } catch (error) {
        console.error('[AMLL] 渲染失败，使用兼容渲染:', error);
        lastAmlLError = error;
        renderLegacyLyricLines(normalizedLines, options.emptyText || '暂无歌词');
        return false;
      }
    }

    function renderLegacyNoLyrics(text = '暂无歌词') {
      deactivateAMLLRenderer({ clearLines: true });
      amLyrics.classList.add('amll-player-host');
      amLyrics.innerHTML = '';
      const div = document.createElement('div');
      div.className = 'item highlight';
      div.style.transform = 'translateZ(0)';
      const p = document.createElement('p');
      p.textContent = text;
      div.appendChild(p);
      amLyrics.appendChild(div);
      amLyricsData = [];
      setAMLLStatus('', 'hidden');
    }

    function renderLegacyLyricLines(lines, emptyText = '暂无歌词') {
      deactivateAMLLRenderer({ clearLines: true });
      amLyrics.classList.add('amll-player-host');
      const legacyLines = (lines || []).map(line => ({
        time: (line.startTime || 0) / 1000,
        end: (line.endTime || (line.startTime || 0) + 5000) / 1000,
        text: lineTextFromAMLL(line),
        translation: line.translatedLyric || '',
        romanLyric: line.romanLyric || '',
        words: (line.words || []).map(word => ({
          start: (word.startTime || line.startTime || 0) / 1000,
          end: (word.endTime || line.endTime || 0) / 1000,
          text: word.word || ''
        })),
        // 保留 _fromTtml 标记，用于判断是否为音节歌词
        _fromTtml: line._fromTtml
      }));
      if (!legacyLines.length) {
        renderLegacyNoLyrics(emptyText);
        return;
      }
      amLyrics.innerHTML = '';
      amLyricsData = legacyLines;
      const fragment = document.createDocumentFragment();
      legacyLines.forEach(line => {
        const div = document.createElement('div');
        div.className = 'item';
        div.dataset.time = line.time;
        div.style.transform = 'translateZ(0)';
        const p = document.createElement('p');

        // 构建逐词/音节 span，支持 TTML 音节歌词的逐字高亮
        if (line.words && line.words.length > 0) {
          const newSpans = [];
          line.words.forEach((w, idx) => {
            const wordText = w.text;
            const isChinese = /^[\u4e00-\u9fff]+$/.test(wordText);
            const shouldSplit = !isChinese && wordText.length > 1 && /^[a-zA-Z]+$/.test(wordText);

            if (shouldSplit) {
              const letters = wordText.split('');
              const wordDuration = Math.max(w.end - w.start, 0.001);
              const letterDuration = wordDuration / letters.length;
              letters.forEach((letter, letterIdx) => {
                const span = document.createElement('span');
                span.className = 'word-lyric';
                span.textContent = letter;
                span.dataset.t = letter;
                const letterStart = w.start + letterIdx * letterDuration;
                const letterEnd = letterStart + letterDuration;
                span.dataset.wstart = letterStart;
                span.dataset.wend = letterEnd;
                span.dataset.letter = 'true';
                span.style.setProperty('--p', '0%');
                p.appendChild(span);
                newSpans.push(span);
              });
            } else {
              const span = document.createElement('span');
              span.className = 'word-lyric';
              span.textContent = wordText;
              span.dataset.t = wordText;
              span.dataset.wstart = w.start;
              span.dataset.wend = w.end;
              span.style.setProperty('--p', '0%');
              p.appendChild(span);
              newSpans.push(span);
            }

            // 空格处理：TTML 音节不需要额外空格，它们已经直接拼接
            let needSpace = false;
            if (line._fromTtml) {
              // TTML 音节：不在音节之间添加空格
              needSpace = false;
            } else if (isChinese) {
              if (idx < line.words.length - 1) {
                const nextWord = line.words[idx + 1].text;
                const isNextChinese = /^[\u4e00-\u9fff]+$/.test(nextWord);
                if (!isNextChinese) needSpace = true;
              }
            } else {
              if (idx !== line.words.length - 1) needSpace = true;
            }
            if (needSpace) {
              p.appendChild(document.createTextNode(' '));
            }
          });
          line.wordSpans = newSpans;
          newSpans.forEach(span => {
            span.__lastWordProgress = 0;
            span.__wordWasActive = false;
          });
        } else {
          // 无逐词数据时，直接显示文本
          p.textContent = line.text;
          line.wordSpans = [];
        }

        div.appendChild(p);
        if (line.romanLyric) {
          const roman = document.createElement('p');
          roman.className = 'lyric-roman';
          roman.textContent = line.romanLyric;
          roman.style.cssText = 'font-size:26px;margin-top:8px;opacity:.72;font-weight:400;letter-spacing:.2px;';
          div.appendChild(roman);
        }
        if (line.translation) {
          const trans = document.createElement('p');
          trans.className = 'lyric-translation';
          trans.textContent = line.translation;
          trans.style.cssText = 'font-size:28px;margin-top:8px;opacity:.7;font-weight:400;';
          div.appendChild(trans);
        }
        line.ele = div;
        fragment.appendChild(div);
      });
      amLyrics.appendChild(fragment);
      requestAnimationFrame(() => {
        LYRICS_OFFSET = calculateLyricsOffset();
        rebuildLyricsMetrics(amLyricsData);
        const currentTime = audioPlayer.currentTime || 0;
        lastLyric = -1;
        lastTitleLyricIndex = -1;
        updateAMLyricsHighlight(currentTime);
        if (lastLyric === -1) {
          UpdateLyricsLayout(0, [0], amLyricsData, 0);
        }
        setTimeout(applyLyricsItemTransitions, 50);
      });
      setAMLLStatus('', 'hidden');
    }

    function normalizeNeteaseSearchText(value) {
      return String(value || '')
        .replace(/[（(].*?[）)]/g, ' ')
        .replace(/\b(?:feat\.?|ft\.?|with|version|ver\.?|remaster(?:ed)?|live|伴奏|纯享|完整版|原声带|ost|theme song)\b/ig, ' ')
        .replace(/[\[\]【】《》<>『』「」]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function splitArtistCandidates(artist) {
      const text = Array.isArray(artist) ? artist.filter(Boolean).join(' ') : String(artist || '');
      return [...new Set(text
        .split(/[、,，/&+;；\s]+/)
        .map(x => normalizeNeteaseSearchText(x))
        .filter(Boolean))];
    }

    function getNeteaseSearchResultItems(data) {
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.result?.songs)) return data.result.songs;
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data?.songs)) return data.songs;
      return [];
    }

    function getNeteaseCandidateId(item) {
      return String(item?.id || item?.songId || item?.lyric_id || item?.lyricId || '').trim();
    }

    function getNeteaseCandidateArtistText(item) {
      const artists = item?.artists || item?.ar || item?.artist || item?.singers || item?.SingerName;
      if (Array.isArray(artists)) {
        return artists.map(a => typeof a === 'string' ? a : (a?.name || a?.alias?.[0] || '')).filter(Boolean).join(' ');
      }
      return String(artists || '');
    }

    function scoreNeteaseCandidate(item, cleanName, artistCandidates) {
      const candidateName = normalizeNeteaseSearchText(item?.name || item?.songName || item?.title || '');
      const candidateArtist = normalizeNeteaseSearchText(getNeteaseCandidateArtistText(item));
      const targetName = cleanName.toLowerCase();
      const itemName = candidateName.toLowerCase();
      let score = 0;
      if (targetName && itemName === targetName) score += 80;
      else if (targetName && (itemName.includes(targetName) || targetName.includes(itemName))) score += 45;
      for (const artist of artistCandidates) {
        const a = artist.toLowerCase();
        if (!a) continue;
        if (candidateArtist.toLowerCase().includes(a)) score += 18;
      }
      if (getNeteaseCandidateId(item)) score += 5;
      return score;
    }

    function buildNeteaseSearchQueriesForSong(song) {
      const rawName = String(song?.name || song?.songName || song?.title || '').trim();
      const cleanName = normalizeNeteaseSearchText(rawName) || rawName;
      const artistCandidates = splitArtistCandidates(song?.artist || song?.artists || song?.singer);
      const primaryArtist = artistCandidates[0] || '';
      const album = normalizeNeteaseSearchText(song?.album || song?.albumName || '');
      const candidates = [
        `${cleanName} ${artistCandidates.join(' ')}`.trim(),
        `${cleanName} ${primaryArtist}`.trim(),
        `${rawName} ${primaryArtist}`.trim(),
        album ? `${cleanName} ${album}`.trim() : '',
        cleanName,
        rawName
      ];
      return [...new Set(candidates.map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean))];
    }

    async function resolveNeteaseSongId(song, options = {}) {
      if (!song) return '';
      const { forceSearch = false, bypassCache = false, count = 5 } = options || {};
      const source = getSongSource(song);
      if (!forceSearch && source === 'netease') {
        return String(song.songId || song.id || song.lyric_id || '').trim();
      }

      const queries = buildNeteaseSearchQueriesForSong(song);
      if (!queries.length) return '';
      const cacheKey = `${forceSearch ? 'force' : 'auto'}::${queries.join(' | ')}`;
      if (!bypassCache && neteaseIdResolveCache.has(cacheKey)) return neteaseIdResolveCache.get(cacheKey);

      const cleanName = normalizeNeteaseSearchText(song?.name || song?.songName || song?.title || '');
      const artistCandidates = splitArtistCandidates(song?.artist || song?.artists || song?.singer);
      let lastError = null;

      for (const query of queries) {
        try {
          const url = `https://music-api.gdstudio.xyz/api.php?types=search&source=netease&name=${encodeURIComponent(query)}&count=${encodeURIComponent(count)}&pages=1`;
          console.log('[AMLL] 请求网易云模糊搜索以匹配 TTML ID:', query);
          const response = await wrappedFetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          const items = getNeteaseSearchResultItems(data).filter(item => getNeteaseCandidateId(item));
          if (!items.length) continue;
          const ranked = items
            .map(item => ({ item, score: scoreNeteaseCandidate(item, cleanName, artistCandidates) }))
            .sort((a, b) => b.score - a.score);
          const resolvedId = getNeteaseCandidateId(ranked[0].item);
          if (resolvedId) {
            neteaseIdResolveCache.set(cacheKey, resolvedId);
            console.log('[AMLL] 网易云模糊搜索匹配成功:', query, '=>', resolvedId);
            return resolvedId;
          }
        } catch (error) {
          lastError = error;
          console.warn('[AMLL] 网易云模糊搜索单次失败:', query, error);
        }
      }

      if (lastError) {
        console.warn('[AMLL] 网易云 ID 匹配失败，已尝试全部查询:', queries, lastError);
      } else {
        console.warn('[AMLL] 网易云 ID 匹配失败，未返回可用结果:', queries);
      }
      neteaseIdResolveCache.set(cacheKey, '');
      return '';
    }

    async function fetchAMLLTTMLByNeteaseId(neteaseId) {
      if (!neteaseId) throw new Error('缺少网易云歌曲 ID');
      const url = `${AMLL_TTML_DB_BASE}${encodeURIComponent(neteaseId)}.ttml`;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`TTML 请求失败 HTTP ${response.status}`);
      const content = await response.text();
      if (!content || !/<tt[\s>]/i.test(content)) throw new Error('TTML 内容无效');
      return { content, url };
    }

    async function fetchOfficialNeteaseLyricLines(neteaseId) {
      if (!neteaseId) return { lines: [], rawLyricText: '', rawTlyricText: '' };
      try {
        const lyricJson = await fetchNeteaseLyricAll(neteaseId);
        const yrcText = lyricJson?.yrc?.lyric || '';
        const qrcText = lyricJson?.qrc?.lyric || '';
        const lrcText = lyricJson?.lrc?.lyric || '';
        const tlyricText = lyricJson?.tlyric?.lyric || '';
        const wordLyricText = yrcText || qrcText;
        const wordSource = yrcText ? YRC : (qrcText ? QRC : null);
        if (wordLyricText && wordLyricText.trim()) {
          const wordLines = parseWordLyrics(wordLyricText, wordSource);
          const lrcLines = parseLyrics(lrcText || '');
          const tLines = parseLyrics(tlyricText || '');
          const lrcToT = alignMonotonicByTime(lrcLines.map(x => x.time), tLines.map(x => x.time), 1.2);
          const lrcTranslations = lrcLines.map((_, i) => {
            const ti = lrcToT[i];
            return ti !== -1 ? (tLines[ti]?.text || '') : '';
          });
          const offset = estimateOffset(wordLines.map(x => x.time), lrcLines.map(x => x.time));
          const wrdToLrc = alignMonotonicByTime(wordLines.map(x => x.time + offset), lrcLines.map(x => x.time), 1.5);
          wordLines.forEach((line, i) => {
            const li = wrdToLrc[i];
            if (li !== -1 && lrcTranslations[li]) line.translation = lrcTranslations[li];
          });
          return {
            lines: legacyWordLinesToAMLLLines(wordLines),
            rawLyricText: lrcText || yrcText || qrcText,
            rawTlyricText: tlyricText,
            source: `netease-${wordSource}`
          };
        }
        if (lrcText && lrcText.trim()) {
          return {
            lines: lrcResponseToAMLLLines({ lyric: lrcText, tlyric: tlyricText }),
            rawLyricText: lrcText,
            rawTlyricText: tlyricText
          };
        }
      } catch (error) {
        console.warn('[AMLL] 网易云官方接口获取失败，尝试通用歌词接口:', error);
      }

      const fallbackLyric = await fetchLyrics(neteaseId, 'netease');
      if (!fallbackLyric) return { lines: [], rawLyricText: '', rawTlyricText: '' };
      const processed = await processLyricTranslation(fallbackLyric);
      return {
        lines: lrcResponseToAMLLLines(processed),
        rawLyricText: processed?.lyric || '',
        rawTlyricText: processed?.tlyric || ''
      };
    }

        async function requestLyricsOnlyForSong(song) {
      const songSource = getSongSource(song);
      const songName = song?.name || '未知歌曲';
      const artist = Array.isArray(song?.artist) ? song.artist.filter(Boolean).join(' ') : (song?.artist || '');
      setAMLLStatus('正在请求歌词…', 'loading');

      const shouldForceNeteaseTtmlLookup = getSongSource(song) === 'kugou' || isKugouSongLike(song);
      let neteaseId = '';
      try {
        if (shouldForceNeteaseTtmlLookup) {
          setAMLLStatus('正在通过网易云模糊搜索匹配 TTML…', 'loading');
          console.log('[AMLL] 酷狗源强制执行网易云模糊搜索，并优先尝试社区 TTML。');
        }
        neteaseId = await resolveNeteaseSongId(song, {
          forceSearch: shouldForceNeteaseTtmlLookup,
          bypassCache: shouldForceNeteaseTtmlLookup,
          count: shouldForceNeteaseTtmlLookup ? 8 : 5
        });
      } catch (error) {
        console.warn('[AMLL] 网易云 ID 解析异常:', error);
      }

      // 第一优先级：AMLL 社区 TTML 数据库（支持对唱、背景歌词等高级效果）。
      // 酷狗源会强制先请求网易云搜索接口拿 ID，再用该 ID 请求 TTML；失败后才回退到酷狗 KRC / 网易云官方歌词。
      if (neteaseId) {
        try {
          if (isAMLLRendererMode()) {
            await ensureAMLLPlayer();
          }
          const { content, url } = await fetchAMLLTTMLByNeteaseId(neteaseId);
          const lines = parseTTMLContentToAMLLLines(content);
          if (!lines.length) throw new Error('TTML 未解析出有效歌词行');
          await renderAMLLLines(lines, {
            source: 'amll-ttml-db',
            rawLyricText: serializeAMLLLinesToLrc(lines, 'main'),
            rawTlyricText: serializeAMLLLinesToLrc(lines, 'translated')
          });
          console.log('[AMLL] 已使用社区 TTML 歌词:', url);
          sendCurrentLyricsToDesktop();
          return;
        } catch (error) {
          console.warn('[AMLL] 社区 TTML 不可用，进入下一优先级:', error);
          showDynamicIslandToast('ttml请求失败，可能是库无该曲的ttml或网络问题，可尝试刷新歌词。即将回退歌词。', 5600);
        }
      } else {
        showDynamicIslandToast('ttml请求失败，可能是库无该曲的ttml或网络问题，可尝试刷新歌词。即将回退歌词。', 5600);
      }

      // 第二优先级：酷狗源保留原 KRC 逐字歌词逻辑，转换为 AMLL LyricLine[] 渲染
      if (songSource === 'kugou') {
        try {
          // 注意：此函数现在会在失败时抛出错误，而不是返回空数组
          const finalLines = await fetchKugouWordLyricsWithNeteaseTranslation(songName, artist, song?.hash);
          if (finalLines && finalLines.length) {
            await displayKugouWordLyrics(finalLines);
            console.log('[AMLL] 已使用酷狗 KRC 逐字歌词');
            sendCurrentLyricsToDesktop();
            return;
          } else {
            // 理论上不会走到这里，因为无歌词时会抛错，但兜底处理
            throw new Error('酷狗 KRC 歌词为空');
          }
        } catch (error) {
          console.warn('[AMLL] 酷狗 KRC 歌词失败，进入网易云官方兜底:', error);
          // 继续执行后续网易云逻辑
        }
      }

      // 第三优先级：网易云官方 YRC / LRC，并统一转换为 AMLL LyricLine[]
      const officialNeteaseId = neteaseId || (songSource === 'netease' ? (song?.lyric_id || song?.songId || song?.id) : '');
      if (officialNeteaseId) {
        try {
          const official = await fetchOfficialNeteaseLyricLines(officialNeteaseId);
          if (official.lines.length) {
            await renderAMLLLines(official.lines, {
              source: official.source || 'netease-official',
              rawLyricText: official.rawLyricText || serializeAMLLLinesToLrc(official.lines, 'main'),
              rawTlyricText: official.rawTlyricText || serializeAMLLLinesToLrc(official.lines, 'translated')
            });
            console.log('[AMLL] 已使用网易云官方歌词');
            sendCurrentLyricsToDesktop();
            return;
          }
        } catch (error) {
          console.warn('[AMLL] 网易云官方歌词兜底失败:', error);
        }
      }

      await renderAMLLLines([], { emptyText: '暂无歌词' });
      sendCurrentLyricsToDesktop();
    }

    // ===== 网络请求 =====
    async function fetchLyrics(lyricId, source = currentSettings.source) {
        try {
            const r = await wrappedFetch(`https://music-api.gdstudio.xyz/api.php?types=lyric&source=${source}&id=${lyricId}`);
            if (!r.ok) throw new Error('无法获取歌词');
            return await r.json();
        } catch (e) {
            console.error('Error fetching lyrics:', e);
            return null;
        }
    }

    function parseWordLyrics(yrcText, format = 'yrc') {
      if (!yrcText || typeof yrcText !== 'string') return [];
      const lines = yrcText.split('\n').filter(x => x.trim());
      const result = [];

      for (const line of lines) {
        const lineMatch = line.match(/^\[(\d+),(\d+)\]/);
        if (!lineMatch) continue;

        const lineStart = parseInt(lineMatch[1], 10);
        const lineDur = parseInt(lineMatch[2], 10);
        const rest = line.replace(/^\[\d+,\d+\]/, '');

        // 兼容两种逐字歌词格式：YRC/QRC 用 (...) ，KRC 用 <...>
        const hasKrcTags = /<(\d+),\d+,\d+>/.test(rest);
        const wordRe = hasKrcTags
          ? /<(\d+),(\d+),\d+>([^<]*)/g
          : /\((\d+),(\d+),(\d+)\)([^()]+)/g;
        const words = [];
        let m;
        while ((m = wordRe.exec(rest)) !== null) {
          const wStart = parseInt(m[1], 10);
          const wDur = parseInt(m[2], 10);
          const text = (m[4] || '').replace(/\\n/g, '');
          if (text.length === 0) continue;
          if (hasKrcTags) {
            // KRC 词级时间为相对行首的偏移，需叠加上行首时间
            words.push({
              start: (lineStart + wStart) / 1000,
              end: (lineStart + wStart + wDur) / 1000,
              text
            });
          } else {
            words.push({
              start: wStart / 1000,
              end: (wStart + wDur) / 1000,
              text
            });
          }
        }

        if (words.length === 0) {
          const fallbackText = rest
            .replace(/\(\d+,\d+,\d+\)/g, '')
            .replace(/<(\d+),\d+,\d+>/g, '')
            .replace(/\\n/g, '');
          if (fallbackText.trim()) {
            result.push({
              time: lineStart / 1000,
              end: (lineStart + lineDur) / 1000,
              words: [],
              text: fallbackText.trim(),
              translation: ''
            });
          }
          continue;
        }

        result.push({
          time: lineStart / 1000,
          end: (lineStart + lineDur) / 1000,
          words,
          text: joinLyricWordsPreservingSpaces(words),
          translation: ''
        });
      }

      return result.sort((a, b) => a.time - b.time);
    }

    async function fetchNeteaseLyricAll(songId) {
      const baseUrl =
        `https://music.163.com/api/song/lyric` +
        `?id=${encodeURIComponent(songId)}&lv=1&tv=1&yv=1&qv=1`;

      const proxies = [];

      if (lyricsSettings.neteaseProxy) {
        proxies.push(lyricsSettings.neteaseProxy);
      }
      proxies.push(...BUILTIN_NETEASE_PROXIES);

      let lastError;

      for (const proxy of proxies) {
        try {
          const url = proxy.includes('?')
            ? `${proxy}${encodeURIComponent(baseUrl)}`
            : `${proxy}${baseUrl}`;

          const r = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });

          if (!r.ok) throw new Error(`HTTP ${r.status}`);

          const data = await r.json();
          if (data && (data.lrc || data.yrc || data.qrc)) {
            console.log('[逐字歌词] 使用代理成功:', proxy);
            return data;
          }
        } catch (e) {
          console.warn('[逐字歌词] 代理失败:', proxy, e);
          lastError = e;
        }
      }

      throw lastError || new Error('所有代理均不可用');
    }

        async function displayAMWordLyrics(neteaseLyricJson) {
      const yrcText = neteaseLyricJson?.yrc?.lyric || '';
      const qrcText = neteaseLyricJson?.qrc?.lyric || '';
      const lrcText = neteaseLyricJson?.lrc?.lyric || '';
      const tlyricText = neteaseLyricJson?.tlyric?.lyric || '';

      const wordLyricText = yrcText || qrcText;
      const wordSource = qrcText ? QRC : YRC;
      const wordLines = parseWordLyrics(wordLyricText, wordSource);
      if (!wordLines.length) {
        return await displayAMLyrics({ lyric: lrcText || '', tlyric: tlyricText || '' });
      }

      const lrcLines = parseLyrics(lrcText || '');
      const tLines = parseLyrics(tlyricText || '');
      const lrcToT = alignMonotonicByTime(lrcLines.map(x => x.time), tLines.map(x => x.time), 1.2);
      const lrcTranslations = lrcLines.map((_, i) => {
        const ti = lrcToT[i];
        return ti !== -1 ? (tLines[ti]?.text || '') : '';
      });
      const wrdTimes = wordLines.map(x => x.time);
      const lrcTimes = lrcLines.map(x => x.time);
      const offset = estimateOffset(wrdTimes, lrcTimes);
      const wrdToLrc = alignMonotonicByTime(wrdTimes.map(t => t + offset), lrcTimes, 1.5);
      wordLines.forEach((line, i) => {
        const li = wrdToLrc[i];
        if (li !== -1 && lrcTranslations[li]) line.translation = lrcTranslations[li];
      });

      const amllLines = legacyWordLinesToAMLLLines(wordLines);
      return await renderAMLLLines(amllLines, {
        source: `netease-${wordSource}`,
        rawLyricText: lrcText || yrcText || serializeAMLLLinesToLrc(amllLines, 'main'),
        rawTlyricText: tlyricText || serializeAMLLLinesToLrc(amllLines, 'translated')
      });
    }

    function rebuildCurrentLineWordSpans(currentLine) {
        if (!currentLine || !currentLine.ele || !currentLine.words || currentLine.words.length === 0) return false;

        const p = currentLine.ele.querySelector('p');
        if (!p) return false;

        const oldSpans = p.querySelectorAll('.word-lyric');
        oldSpans.forEach(span => span.remove());

        const newSpans = [];
        currentLine.words.forEach((w, idx) => {
            const wordText = w.text;
            const isChinese = /^[\u4e00-\u9fff]+$/.test(wordText);
            const shouldSplit = !isChinese && wordText.length > 1 && /^[a-zA-Z]+$/.test(wordText);

            if (shouldSplit) {
                const letters = wordText.split('');
                const wordDuration = w.end - w.start;
                const letterDuration = wordDuration / letters.length;
                letters.forEach((letter, letterIdx) => {
                    const span = document.createElement('span');
                    span.className = 'word-lyric';
                    span.textContent = letter;
                    span.dataset.t = letter;
                    const letterStart = w.start + letterIdx * letterDuration;
                    const letterEnd = letterStart + letterDuration;
                    span.dataset.wstart = letterStart;
                    span.dataset.wend = letterEnd;
                    span.dataset.letter = 'true';
                    span.style.setProperty('--p', '0%');
                    p.appendChild(span);
                    newSpans.push(span);
                });
            } else {
                const span = document.createElement('span');
                span.className = 'word-lyric';
                span.textContent = wordText;
                span.dataset.t = wordText;
                span.dataset.wstart = w.start;
                span.dataset.wend = w.end;
                span.style.setProperty('--p', '0%');
                p.appendChild(span);
                newSpans.push(span);
            }

            let needSpace = false;
            if (isChinese) {
                if (idx < currentLine.words.length - 1) {
                    const nextWord = currentLine.words[idx + 1].text;
                    const isNextChinese = /^[\u4e00-\u9fff]+$/.test(nextWord);
                    if (!isNextChinese) needSpace = true;
                }
            } else {
                if (idx !== currentLine.words.length - 1) needSpace = true;
            }
            if (needSpace) {
                p.appendChild(document.createTextNode(' '));
            }
        });

        currentLine.wordSpans = newSpans;
        newSpans.forEach(span => {
            span.__lastWordProgress = 0;
          span.__wordWasActive = false;
        });

        return true;
    }

    function resetAllWordsProgress(targetLineIndex = -1) {
        if (!amLyricsData.length) return;
        const resetLine = (index) => {
            if (index < 0 || index >= amLyricsData.length) return;
            const line = amLyricsData[index];
            if (!line || !line.wordSpans || line.wordSpans.length === 0) return;
            line.wordSpans.forEach(span => {
                span.style.transition = 'none';
                span.style.setProperty('--p', '0%');
                span.__lastWordProgress = 0;
                span.__wordWasActive = false;
                span.classList.remove('active-word', 'word-jump');
            });
        };
        if (targetLineIndex >= 0) {
            resetLine(targetLineIndex - 1);
            resetLine(targetLineIndex);
            resetLine(targetLineIndex + 1);
        } else {
            for (const line of amLyricsData) {
                if (line.wordSpans) {
                    resetLine(amLyricsData.indexOf(line));
                }
            }
        }
        requestAnimationFrame(() => {
        });
    }

    function resetLineWordReplayState(line) {
        if (!line?.ele) return;
        const spans = line.wordSpans || (line.wordSpans = Array.from(line.ele.querySelectorAll('span.word-lyric[data-wstart][data-wend]')));
        spans.forEach(sp => {
            sp.classList.remove('active-word', 'word-jump');
            sp.style.transform = '';
            sp.style.setProperty('--p', '0%');
            sp.__lastProgress = 0;
            sp.__wordWasActive = false;
            sp.style.transitionProperty = '';
            sp.style.transitionDuration = '';
            sp.style.transitionTimingFunction = '';
        });
    }

    function isWordLyricJumpEnabled() {
        return lyricsSettings.wordLyricsJumpEnabled !== false;
    }

    function clearWordLyricJumpState() {
        document.querySelectorAll('.word-lyric').forEach(span => {
            span.classList.remove('active-word', 'word-jump', 'no-transition');
            span.style.transform = 'translateY(0)';
            span.style.setProperty('--p', '0%');
            span.__wordWasActive = false;
            span.__lastProgress = 0;
        });
        lastWordLyricTime = -1;
        lastWordLyricLineIndex = -1;
    }

    function applyWordLyricJumpSetting(enabled, options = {}) {
        const { persist = true, toast = true } = options;
        lyricsSettings.wordLyricsJumpEnabled = !!enabled;
        document.body.classList.toggle('word-lyric-jump-disabled', !lyricsSettings.wordLyricsJumpEnabled);

        if (enableWordLyricJump) {
            enableWordLyricJump.checked = lyricsSettings.wordLyricsJumpEnabled;
        }

        if (!lyricsSettings.wordLyricsJumpEnabled) {
            document.querySelectorAll('.word-lyric').forEach(span => {
                span.style.transform = 'translateY(0)';
                span.classList.remove('active-word', 'word-jump');
                span.__wordWasActive = false;
            });
        } else {
            const t = audioPlayer.currentTime || 0;
            if (lastLyric >= 0 && amLyricsData.length) {
                updateWordFillInActiveLine(t, true);
            }
        }

        if (persist) {
            localStorage.setItem('lyricsSettings', JSON.stringify(lyricsSettings));
        }
        if (toast) {
            showDynamicIslandToast(
                lyricsSettings.wordLyricsJumpEnabled ? '已开启逐字渐进上升' : '已关闭逐字上升',
                2200
            );
        }
    }

    function updateWordFillInActiveLine(currentTime, force = false) {
        if (!amLyricsData?.length || lastLyric < 0) return;
        const line = amLyricsData[lastLyric];
        if (!line?.ele) return;
        const spans = line.wordSpans || (line.wordSpans = Array.from(line.ele.querySelectorAll('span.word-lyric[data-wstart][data-wend]')));
        if (!spans.length) return;
        spans.forEach(sp => {
            const ws = parseFloat(sp.dataset.wstart);
            const we = parseFloat(sp.dataset.wend);
            const dur = Math.max(we - ws, 0.001);
            let p = 0;
            const isNowActive = currentTime > ws;
            if (currentTime <= ws) {
                p = 0;
            } else if (currentTime >= we) {
                p = 100;
            } else {
                p = ((currentTime - ws) / dur) * 100;
            }
            const currentPStr = p.toFixed(1);
            if (sp.__lastProgress !== currentPStr) {
                sp.style.setProperty('--p', `${currentPStr}%`);
                sp.__lastProgress = currentPStr;
            }
            let lift = 0;
            if (isNowActive && p > 0) {
                const linear = p / 100;
                lift = linear * LIFT_AMOUNT_PX;
            }
            const targetTransform = `translateY(-${lift.toFixed(2)}px)`;
            sp.style.transform = targetTransform;
            if (isNowActive && !sp.__wordWasActive) {
                sp.classList.add('active-word');
                sp.__wordWasActive = true;
            } else if (!isNowActive && sp.__wordWasActive) {
                sp.classList.remove('active-word');
                sp.__wordWasActive = false;
            }
        });

        lastWordLyricTime = currentTime;
        lastWordLyricLineIndex = lastLyric;
    }

    function isForeignLyric(lyricText) {
      if (!lyricText || typeof lyricText !== 'string') {
        return false;
      }

      const lines = lyricText.split('\n');
      let totalContentLines = 0;
      let foreignContentLines = 0;

      const metadataKeywords = [
        '作词', '作曲', '编曲', '制作', '演唱', '原唱', '翻译', '歌词',
        '专辑', '歌曲', '编配', '混音', '母带', '录音', '和声', '出品',
        'Lyric', 'Composer', 'Arranger', 'Producer', 'Singer', 'Artist',
        'Album', 'Song', 'Mixed', 'Mastered', 'Recorded', 'Vocal', 'Chorus',
        'Production', 'Copyright', 'Published', 'Release', 'Distributed'
      ];

      const songInfoPatterns = [
        /^\[(?:ti|ar|al|by|offset|re|ve):/i,  // LRC标签
        /^原唱[:：]/,
        /^演唱[:：]/,
        /^作曲[:：]/,
        /^作词[:：]/,
        /^编曲[:：]/,
        /^制作[:：]/,
        /^\s*\(.*\)\s*$/,  // 纯括号内容
        /^\s*\[.*\]\s*$/   // 纯方括号内容（无时间轴）
      ];

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        const timeMatch = trimmedLine.match(/^\[(\d{2}):(\d{2})[\.:](\d{2,3})\]/);
        if (!timeMatch) {
          const isMetadata = metadataKeywords.some(keyword =>
            trimmedLine.includes(keyword) ||
            trimmedLine.toLowerCase().includes(keyword.toLowerCase())
          ) || songInfoPatterns.some(pattern => pattern.test(trimmedLine));

          if (isMetadata) continue; // 跳过元数据行
          else continue; // 非时间轴非元数据行也跳过（可能是空行格式）
        }

        const textContent = trimmedLine.slice(timeMatch[0].length).trim();
        if (!textContent) continue; // 空歌词行

        const hasMetadataInContent = metadataKeywords.some(keyword =>
          textContent.includes(keyword)
        );
        if (hasMetadataInContent) continue;

        totalContentLines++;

        const chineseChars = (textContent.match(/[\u4e00-\u9fff]/g) || []);
        const nonChineseChars = textContent.replace(/[\u4e00-\u9fff]/g, '').replace(/\s/g, '').length;
        const totalRelevantChars = chineseChars.length + nonChineseChars;

        if (totalRelevantChars === 0) {
          totalContentLines--; // 没有有效字符，不计入统计
          continue;
        }

        const chineseRatio = chineseChars.length / totalRelevantChars;

        if (chineseRatio < 0.2) {
          foreignContentLines++;
        }
      }

      console.log(`歌词检测: 总有效行=${totalContentLines}, 外语行=${foreignContentLines}, 比例=${totalContentLines > 0 ? (foreignContentLines/totalContentLines).toFixed(2) : 0}`);

      if (totalContentLines === 0) return false;

      const isForeign = (foreignContentLines / totalContentLines) > 0.4;
      console.log(`是否为外语歌词: ${isForeign}`);
      return isForeign;
    }

    async function translateLyrics(lyricText) {
        if (!translationSettings.apiToken) {
            throw new Error('请先设置API令牌');
        }

        const prompt = `帮我将下面这段的歌词富有文采地翻译为中文，并保留时间轴；按照原格式输出结果；我只要翻译后的结果，别的一律不要\n\n${lyricText}`;

        try {
            const response = await wrappedFetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${translationSettings.apiToken}`
                },
                body: JSON.stringify({
                    model: 'GLM-4.7-Flash',
                    messages: [{ role: 'user', content: prompt }],
                    stream: false,
                    temperature: 0.3
                })
            });
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`API请求失败: ${response.status} ${error}`);
            }
            const data = await response.json();
            if (data.choices && data.choices[0] && data.choices[0].message) {
                return data.choices[0].message.content.trim();
            } else {
                throw new Error('API返回格式异常');
            }
        } catch (error) {
            console.error('翻译失败:', error);
            throw error;
        }
    }

    async function processLyricTranslation(lyricResponse) {
      if (!translationSettings.enabled || !lyricResponse || !lyricResponse.lyric) {
        return lyricResponse;
      }

      const originalLyric = lyricResponse.lyric || '';
      const existingTranslation = lyricResponse.tlyric || '';

      const isForeign = isForeignLyric(originalLyric);
      if (!isForeign) {
        console.log('非外语歌词，跳过翻译');
        return lyricResponse;
      }

      let needTranslate = false;
      if (translationSettings.scope === 'no-translation') {
        const hasExistingTranslation = existingTranslation.trim().length > 0;
        needTranslate = !hasExistingTranslation;
        console.log(`no-translation模式: 已有翻译=${hasExistingTranslation}, 需要翻译=${needTranslate}`);
      } else if (translationSettings.scope === 'all-foreign') {
        needTranslate = true;
        console.log('all-foreign模式: 强制翻译所有外语歌');
      }

      if (!needTranslate) {
        return lyricResponse;
      }

      try {
        showError('正在翻译歌词...', 3000);
        const translatedLyric = await translateLyrics(originalLyric);

        return {
          ...lyricResponse,
          lyric: originalLyric,      // 保持原文不变
          tlyric: translatedLyric    // 翻译结果作为翻译歌词
        };
      } catch (error) {
        console.error('歌词翻译失败:', error);
        showError(`翻译失败: ${error.message}`, 3000);
        return lyricResponse;
      }
    }

    async function getAlbumArtUrl(picId, source = currentSettings.source) {
        try {
            const normalizedSource = normalizeMusicSource(source);
            if (normalizedSource === 'kugou') {
                const directUrl = normalizeKugouImageUrl(picId);
                if (/^https?:\/\//i.test(directUrl)) {
                    return directUrl;
                }
            }
            const r = await wrappedFetch(`https://music-api.gdstudio.xyz/api.php?types=pic&source=${normalizedSource}&id=${encodeURIComponent(picId)}&size=500`);
            if (!r.ok) throw new Error('无法获取专辑图片');
            const data = await r.json();
            if (!data.url) throw new Error('无效的专辑图片URL');
            return data.url.replace(/\\/g, '');
        } catch (e) {
            console.error('Error fetching album art:', e);
            return null;
        }
    }

    async function loadAlbumArt(picId, source) {
      console.log('[loadAlbumArt] 开始加载专辑封面, picId:', picId, 'source:', source);
      albumArt.classList.remove('loaded');

      const bgDiv = document.querySelector('.am-background');
      if (!bgDiv) {
        console.error('[loadAlbumArt] 错误: 未找到 .am-background 元素！');
        return;
      }

      if (!picId) {
        console.warn('[loadAlbumArt] picId 为空，使用默认背景');
        albumArt.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        albumArt.classList.add('loaded');
        bgDiv.style.backgroundImage = 'none';
        bgDiv.style.backgroundColor = 'var(--bg-dark)';
        return;
      }

      try {
        const url = await getAlbumArtUrl(picId, source);
        console.log('[loadAlbumArt] 获取到图片 URL:', url);

        if (!url) {
          throw new Error('专辑封面 URL 为空');
        }

        const img = new Image();
        img.crossOrigin = 'anonymous'; // 尝试跨域，但不强制依赖它

        img.onload = () => {
          console.log('[loadAlbumArt] 图片加载成功，开始应用封面和背景');

          albumArt.src = url;
          albumArt.classList.add('loaded');
          albumArtContainer.style.backgroundImage = `url(${url})`;

          bgDiv.style.setProperty('background-image', `url(${url})`, 'important');
          bgDiv.style.setProperty('background-size', 'cover', 'important');
          bgDiv.style.setProperty('background-position', 'center', 'important');
          bgDiv.style.setProperty('background-repeat', 'no-repeat', 'important');
          bgDiv.style.setProperty('filter', 'blur(30px) brightness(0.6)', 'important');
          bgDiv.style.setProperty('transform', 'scale(1.2)', 'important');

          bgDiv.style.backgroundColor = 'transparent';

          console.log('[loadAlbumArt] 模糊背景设置成功');
        };

        img.onerror = (err) => {
          console.error('[loadAlbumArt] 图片加载失败:', err, 'URL:', url);

          albumArt.src = `https://picsum.photos/seed/${Date.now()}/500`;
          albumArt.classList.add('loaded');

          bgDiv.style.backgroundImage = 'none';
          bgDiv.style.backgroundColor = 'var(--bg-dark)';
          bgDiv.style.filter = ''; // 清除模糊，避免纯色模糊奇怪
          bgDiv.style.transform = '';
        };

        img.src = url;

      } catch (error) {
        console.error('[loadAlbumArt] 获取专辑封面 URL 失败:', error);

        albumArt.src = `https://picsum.photos/seed/${Date.now()}/500`;
        albumArt.classList.add('loaded');

        if (bgDiv) {
          bgDiv.style.backgroundImage = 'none';
          bgDiv.style.backgroundColor = 'var(--bg-dark)';
          bgDiv.style.filter = '';
          bgDiv.style.transform = '';
        }
      }
    }

    const bgModeSelect = document.getElementById('bg-mode-select');
    const fluidBg = document.getElementById('fluid-bg-container');
    const staticBg = document.getElementById('bg-blur');

    // ===== 空闲自动隐藏主页 UI（动态岛、菜单按钮、关闭按钮） =====
    const IDLE_TIMEOUT = 3000; // 3 秒无操作后隐藏
    let idleTimer = null;
    const idleTargets = ['dynamicIsland', 'menuToggle', 'dynamicIslandClose', 'fabMain'];

    function showIdleTargets() {
      document.body.classList.remove('idle-state');
      idleTargets.forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.opacity = ''; el.style.pointerEvents = ''; }
      });
      resetIdleTimer();
    }

    function hideIdleTargets() {
      document.body.classList.add('idle-state');
    }

    function resetIdleTimer() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(hideIdleTargets, IDLE_TIMEOUT);
    }

    function onUserActivity() {
      if (document.body.classList.contains('idle-state')) {
        showIdleTargets();
      } else {
        resetIdleTimer();
      }
    }

    function initIdleHide() {
      ['mousemove', 'mousedown', 'click', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
        window.addEventListener(evt, onUserActivity, { passive: true });
      });
      resetIdleTimer();
    }

    document.addEventListener('DOMContentLoaded', () => {
        const savedMode = localStorage.getItem('settings-bg-mode') || 'static';
        if (bgModeSelect) bgModeSelect.value = savedMode;
        updateBgVisual(savedMode);
        updateKugouAccountUI();

        // 网络状态检测
        window.addEventListener('offline', () => {
          showDynamicIslandToast('⚠️ 网络已断开，部分功能不可用', 4000);
        });
        window.addEventListener('online', () => {
          showDynamicIslandToast('✅ 网络已恢复', 2000);
        });
        if (!navigator.onLine) {
          showDynamicIslandToast('⚠️ 当前处于离线状态', 4000);
        }

        // 提前加载 AMLL 歌词引擎，避免首次播放时等待
        const savedRenderer = localStorage.getItem(LYRICS_RENDERER_MODE_KEY) || 'amll';
        if (savedRenderer === 'amll') {
          const delayMs = isMobileDevice() ? 800 : 200;
          setTimeout(() => {
            ensureAMLLPlayer().catch(() => {
              console.warn('[AMLL] 预加载失败，将在首次播放时重试');
            });
          }, delayMs);
        }

        // 兜底：空闲隐藏初始化（覆盖 DOMContentLoaded 已提前触发的情况）
        initIdleHide();
    });

    // 兜底：覆盖 DOMContentLoaded 未触发或已触发的情况
    initIdleHide();

    // ===== 一次性背景图 API（每次进入网页仅请求一次） =====
    (function fetchStartupBackground() {
      // 如果本次会话已请求过，直接跳过
      if (sessionStorage.getItem('startupBgFetched')) return;

      const deviceType = isMobileDevice() ? 'wap' : 'pc';
      const apiUrl = `https://v2.xxapi.cn/api/randomAcgPic?type=${deviceType}`;

      fetch(apiUrl)
        .then(res => res.json())
        .then(json => {
          if (json?.code === 200 && json?.data) {
            const bgDiv = document.querySelector('.am-background');
            if (bgDiv) {
              bgDiv.style.backgroundImage = `url(${json.data})`;
              bgDiv.style.backgroundSize = 'cover';
              bgDiv.style.backgroundPosition = 'center';
              bgDiv.style.backgroundRepeat = 'no-repeat';
              bgDiv.classList.add('has-art');
            }
          }
        })
        .catch(err => console.warn('[StartupBg] 获取背景图失败:', err))
        .finally(() => {
          sessionStorage.setItem('startupBgFetched', '1');
        });
    })();

    async function getAudioUrl(id, source = currentSettings.source, song = null) {
        try {
            const normalizedSource = normalizeMusicSource(source);
            if (normalizedSource === 'kugou') {
                const hash = String(song?.hash || song?.id || id || '').trim();
                if (!hash) throw new Error('缺少酷狗歌曲 hash');
                return await getKugouAudioUrlByHash(hash);
            }
            const playableId = song?.songId || id;
            const r = await wrappedFetch(`https://music-api.gdstudio.xyz/api.php?types=url&source=${normalizedSource}&id=${encodeURIComponent(playableId)}&br=${currentSettings.quality}`);
            const data = await r.json();
            if (!data.url) throw new Error('无法获取音频链接');
            return data.url.replace(/\\/g, '');
        } catch (e) {
            console.error('Error fetching audio URL:', e);
            throw e;
        }
    }

    async function searchKugouTracks(query, page = 1, pageSize = 20) {
        if (!kugouToken) {
            throw new Error('请先在设置-账户中登录酷狗账号');
        }
        const timestamp = Date.now();
        const url = `${KUGOU_API_BASE}/search?keywords=${encodeURIComponent(query)}&page=${page}&pagesize=${pageSize}&token=${encodeURIComponent(kugouToken)}&timestamp=${timestamp}`;
        const res = await wrappedFetchWithRetry(url, { credentials: 'include' });
        if (!res.ok) throw new Error('酷狗搜索失败');
        const payload = await res.json();
        const lists = payload?.data?.lists;
        if (payload?.status !== 1 || !Array.isArray(lists)) {
            throw new Error(payload?.error_msg || payload?.msg || '酷狗搜索结果异常');
        }
        return lists.map(normalizeKugouSearchResult).filter(Boolean);
    }

    // ===== 搜索与播放逻辑 =====
    async function searchMusic(query, page = 1) {
        if (!query.trim()) {
            showError('请输入搜索内容');
            return;
        }

        startRequest(); // 开始请求，收缩岛并显示”正在请求中”

        try {
            clearError();
            const source = normalizeMusicSource(currentSettings.source);
            let data = [];

            if (source === 'kugou') {
                data = await searchKugouTracks(query, page, 20);
            } else {
                const r = await wrappedFetch(`https://music-api.gdstudio.xyz/api.php?types=search&source=${source}&name=${encodeURIComponent(query)}&count=20&pages=${page}`);
                if (!r.ok) throw new Error('搜索失败');
                const raw = await r.json();
                data = Array.isArray(raw)
                    ? raw.map(item => normalizeTrack({ ...item, source, songId: item?.songId || item?.id }, source))
                    : [];
            }

            if (!data || data.length === 0) throw new Error('未找到相关歌曲');

            currentSearchResults = data;
            displaySearchResults(data);
            updatePagination(page);
            currentPage = page;

            endRequest(true);
            expandDynamicIsland();
        } catch (e) {
            endRequest(false);
            showError(e.message);
            searchResults.innerHTML = '';
            pagination.style.display = 'none';
        }
    }

    function ensureSearchResultsDelegation() {
      if (!searchResultsClickBound) {
        searchResults.addEventListener('click', (e) => {
          const actionBtn = e.target.closest('.island-result-action');
          const resultItem = e.target.closest('.island-result-item');
          if (!resultItem || !searchResults.contains(resultItem)) return;

          const idx = parseInt(resultItem.dataset.index, 10);
          const song = currentSearchResults[idx];
          if (!song) return;

          if (actionBtn) {
            e.stopPropagation();
            if (actionBtn.classList.contains('favorite')) {
              const added = addToFavorites(song);
              if (added) {
                actionBtn.innerHTML = '<i class="fas fa-check"></i>';
                actionBtn.classList.add('active');
                setTimeout(() => {
                  actionBtn.innerHTML = '<i class="fas fa-heart"></i>';
                  actionBtn.classList.remove('active');
                }, 1000);
              }
            } else {
              addToPlaylist(song);
            }
            return;
          }

          playTrack(idx);
        });
        searchResultsClickBound = true;
      }

      if (!paginationClickBound) {
        pagination.addEventListener('click', (e) => {
          const btn = e.target.closest('.island-page-btn[data-page-action]');
          if (!btn || btn.disabled) return;

          const action = btn.dataset.pageAction;
          if (action === 'prev' && currentPage > 1) {
            searchMusic(searchInput.value.trim(), currentPage - 1);
          } else if (action === 'next') {
            searchMusic(searchInput.value.trim(), currentPage + 1);
          }
        });
        paginationClickBound = true;
      }
    }

    function displaySearchResults(results) {
      ensureSearchResultsDelegation();
      searchResults.innerHTML = '';
      if (results.length === 0) {
        searchResults.innerHTML = `<div class="island-empty">
          <i class="fas fa-search"></i>
          <div class="island-empty-text">未找到相关歌曲</div>
        </div>`;
        pagination.style.display = 'none';
        return;
      }

      const fragment = document.createDocumentFragment();
      results.forEach((song, idx) => {
        const item = document.createElement('div');
        item.className = 'island-result-item';
        item.dataset.index = idx;
        const artists = toArtistText(song.artist);
        const sourceBadge = getSourceBadgeHtml(song);
        item.innerHTML = `
          <div class="island-result-info">
            <div class="island-result-title-row">
              <div class="island-result-title">${escapeHtml(song.name || '未知歌曲')}</div>
              ${sourceBadge}
            </div>
            <div class="island-result-artist">${escapeHtml(artists)}</div>
          </div>
          <div class="island-result-actions">
            <button class="island-result-action" data-index="${idx}" title="添加到播放列表">
              <i class="fas fa-plus"></i>
            </button>
            <button class="island-result-action favorite" data-index="${idx}" title="添加到收藏">
              <i class="fas fa-heart"></i>
            </button>
          </div>`;
        fragment.appendChild(item);
      });
      searchResults.appendChild(fragment);
      pagination.style.display = 'flex';
    }

    function updatePagination(curPage) {
      ensureSearchResultsDelegation();
      pagination.innerHTML = `
        <button class="island-page-btn" data-page-action="prev" ${curPage <= 1 ? 'disabled' : ''}>上一页</button>
        <button class="island-page-btn active" style="cursor:default;" disabled>第 ${curPage} 页</button>
        <button class="island-page-btn" data-page-action="next">下一页</button>
      `;
    }

    async function playSong(song, isFromPlaylist = false) {
      try {
        if (guardSongSwitch(song?.id)) return;
        clearError();

        if (currentMvVideoUrl && mvVideoPlayer.src && !mvVideoPlayer.paused) {
          stopCurrentMv();
        }

        nowPlayingTitle.textContent = song.name || '未知歌曲';
        const songSourceName = getMusicSourceName(song?.source);
        const artistText = toArtistText(song.artist);
        if (nowPlayingArtist) {
          nowPlayingArtist.textContent = `${songSourceName} · ${artistText}`;
        }
        currentSongInfo = {
          name: song.name || '未知歌曲',
          artist: `${songSourceName} · ${artistText}`,
          album: song.album || ''
        };
        currentSongData = song;
        updateLyricsRerequestDialog();

        updatePageTitle();

        currentPlayingId = song.id;

        if (isFromPlaylist) {
          currentPlaylistIdx = getPlaylistIndexById(song.id);
        }

        updateDynamicIslandWelcome();
        sendCurrentSongToDesktop();
        await loadAlbumArt(song.pic_id, song.source);

        await requestLyricsOnlyForSong(song);
        const audioUrl = await getAudioUrl(song.id, song.source, song);
        audioPlayer.crossOrigin = 'anonymous';

        if (eqSettings.enabled && !eqGraphInitialized) {
          const eqSupport = await probeEqUrlSupport(audioUrl);
          if (!eqSupport.ok) {
            eqSettings.enabled = false;
            persistAndRefreshEqUi();
            showError(`当前歌曲音源不支持浏览器均衡器，已自动关闭：${eqSupport.reason}`, 4800);
          }
        } else if (eqSettings.enabled && eqGraphInitialized) {
          const eqSupport = await probeEqUrlSupport(audioUrl);
          if (!eqSupport.ok && !eqSupportNoticeShown) {
            eqSupportNoticeShown = true;
            showError('这个音源不支持浏览器均衡器。为避免静音，请刷新页面后保持均衡器关闭，或切换到支持跨域音频处理的音源。', 6000);
          }
        }

        audioPlayer.src = audioUrl;

        // 恢复上次播放位置（仅当歌曲 ID 匹配且距今不超过 24 小时）
        if (audioPlayer._restoreId === song.id && audioPlayer._restoreTime > 0) {
          audioPlayer.currentTime = audioPlayer._restoreTime;
          delete audioPlayer._restoreTime;
          delete audioPlayer._restoreId;
        }

        await audioPlayer.play()
          .then(() => {
            playButton.innerHTML = '<i class="fas fa-pause"></i>';
            isPlaying = true;
            updatePageTitle();
            addToHistory(song);

            if (isFromPlaylist) {
              currentActivePlaylist = playlist;
            } else {
              currentTrackIndex = -1;
            }

            if (currentTab === 'playlist') {
              renderPlaylist();
            }
          })
          .catch(e => {
            playButton.innerHTML = '<i class="fas fa-play"></i>';
            isPlaying = false;
            updatePageTitle();
            if (e.name === "NotAllowedError" || e.name === "AbortError") {
              showError('播放被阻止：请点击播放按钮。');
            } else {
              showError('播放失败: ' + e.message);
            }
          });
          } catch (e) {
            showError(e.message);
            playButton.innerHTML = '<i class="fas fa-play"></i>';
            isPlaying = false;
            updatePageTitle();
        }
    }

    async function playFromPlaylist(index) {
      if (index < 0 || index >= playlist.length) return;
      const song = playlist[index];
      await playSong(song, true);
    }

    async function playTrackFromItem(item) {
      currentActivePlaylist = [];
      currentPlaylistIdx = -1;
      await playSong(item, false);
    }

    async function playTrack(index) {
      if (index < 0 || index >= currentSearchResults.length) return;
      currentActivePlaylist = currentSearchResults;
      await playSong(currentSearchResults[index], false);
      currentPlaylistIdx = -1;
    }

    // ===== Apple Music 歌词处理 =====
    function parseLyrics(lyricText) {
        if (!lyricText) return [];
        const lines = lyricText.split('\n');
        const res = [];
        const re = /\[(\d{2}):(\d{2})(?:[\.:](\d{1,3}))?\]/g;

        for (const line of lines) {
            let match;
            const lineTimestamps = [];
            let cleanLine = line;

            while ((match = re.exec(line)) !== null) {
                const min = parseInt(match[1], 10);
                const sec = parseInt(match[2], 10);

                const ms = match[3] ? parseFloat('0.' + match[3]) : 0;
                const time = min * 60 + sec + ms;

                lineTimestamps.push(time);
                cleanLine = cleanLine.replace(match[0], '');
            }

            cleanLine = cleanLine.trim();
            if (cleanLine && lineTimestamps.length > 0) {
                res.push({ time: Math.min(...lineTimestamps), text: cleanLine, translation: '' });
            }
        }
        return res.filter(l => l.time !== -1).sort((a, b) => a.time - b.time);
    }

        async function displayAMLyrics(lyricResponse) {
      if (!lyricResponse || !lyricResponse.lyric) {
        return await renderAMLLLines([], { emptyText: '暂无歌词' });
      }
      rawLyricText = lyricResponse.lyric || '';
      rawTlyricText = lyricResponse.tlyric || '';
      const lines = lrcResponseToAMLLLines(lyricResponse);
      return await renderAMLLLines(lines, {
        source: 'netease-lrc',
        rawLyricText,
        rawTlyricText,
        emptyText: '暂无歌词'
      });
    }

    function median(arr) {
      if (!arr.length) return 0;
      const a = [...arr].sort((x, y) => x - y);
      const mid = Math.floor(a.length / 2);
      return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
    }

    function alignMonotonicByTime(sourceTimes, targetTimes, maxDiff = 0.9) {
      const mapping = new Array(sourceTimes.length).fill(-1);
      let j = 0;

      for (let i = 0; i < sourceTimes.length; i++) {
        const t = sourceTimes[i];

        while (j + 1 < targetTimes.length && targetTimes[j + 1] <= t) j++;

        const cands = [j, j + 1].filter(x => x >= 0 && x < targetTimes.length);
        let best = -1;
        let bestDiff = Infinity;

        for (const k of cands) {
          const d = Math.abs(targetTimes[k] - t);
          if (d < bestDiff) {
            bestDiff = d;
            best = k;
          }
        }

        if (best !== -1 && bestDiff <= maxDiff) {
          mapping[i] = best;
          j = Math.max(j, best);
        }
      }
      return mapping;
    }

    function estimateOffset(yrcTimes, lrcTimes) {
      if (!yrcTimes.length || !lrcTimes.length) return 0;

      const diffs = [];
      let j = 0;

      for (let i = 0; i < yrcTimes.length; i++) {
        const yt = yrcTimes[i];

        while (j + 1 < lrcTimes.length && lrcTimes[j + 1] <= yt) j++;

        const cands = [j, j + 1].filter(x => x >= 0 && x < lrcTimes.length);
        let best = -1;
        let bestDiff = Infinity;

        for (const k of cands) {
          const d = Math.abs(lrcTimes[k] - yt);
          if (d < bestDiff) {
            bestDiff = d;
            best = k;
          }
        }

        if (best !== -1) {
          diffs.push(lrcTimes[best] - yt);
        }
      }

      return median(diffs);
    }

    function GetLyricsLayout(now, to, data) {
      if (!Array.isArray(data) || data.length === 0) return LYRICS_OFFSET;

      const maxIndex = data.length - 1;
      now = Math.max(0, Math.min(now, maxIndex));
      to = Math.max(0, Math.min(to, maxIndex));

      if (lyricsHeightsPrefix.length !== data.length + 1) {
        rebuildLyricsMetrics(data);
      }

      let res = 0;
      if (to > now) {
        res = lyricsHeightsPrefix[to] - lyricsHeightsPrefix[now];
      } else if (to < now) {
        res = -(lyricsHeightsPrefix[now] - lyricsHeightsPrefix[to]);
      }

      return res + LYRICS_OFFSET;
    }

    function findActiveLyricIndex(currentTime) {
      if (!Array.isArray(amLyricsData) || amLyricsData.length === 0) return -1;

      let idx = lastLyric;
      if (idx >= 0 && idx < amLyricsData.length) {
        if (currentTime < amLyricsData[idx].time) {
          while (idx > 0 && amLyricsData[idx].time > currentTime) {
            idx--;
          }
          if (amLyricsData[idx].time > currentTime) {
            return -1;
          }
          while (idx + 1 < amLyricsData.length && amLyricsData[idx + 1].time <= currentTime) {
            idx++;
          }
          return idx;
        }

        while (idx + 1 < amLyricsData.length && amLyricsData[idx + 1].time <= currentTime) {
          idx++;
        }
        return idx;
      }

      let left = 0;
      let right = amLyricsData.length - 1;
      let answer = -1;
      while (left <= right) {
        const mid = (left + right) >> 1;
        if (amLyricsData[mid].time <= currentTime) {
          answer = mid;
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }
      return answer;
    }

    function UpdateLyricsLayout(mainIndex, highlightIndices, data, init = 1) {
      if (!Array.isArray(data) || data.length === 0) return;

      pendingLyricsLayout = {
        mainIndex,
        highlightIndices: Array.isArray(highlightIndices) && highlightIndices.length ? highlightIndices : [mainIndex],
        data,
        init
      };

      if (lyricsLayoutRAF) {
        cancelAnimationFrame(lyricsLayoutRAF);
      }

      lyricsLayoutRAF = requestAnimationFrame(() => {
        lyricsLayoutRAF = 0;
        const task = pendingLyricsLayout;
        pendingLyricsLayout = null;
        if (!task || !Array.isArray(task.data) || task.data.length === 0) return;

        const { mainIndex, data, init } = task;
        const performanceMode = isPerformanceLyricsMode();
        const previewMode = isPreviewLyricsMode();
        const highlightSet = new Set(task.highlightIndices);

        if (lyricsHeightsPrefix.length !== data.length + 1) {
          rebuildLyricsMetrics(data);
        }

        for (let i = 0; i < data.length; i++) {
          if (!data[i] || !data[i].ele) continue;

          const ele = data[i].ele;
          const isHighlight = highlightSet.has(i);
          const distance = Math.abs(i - mainIndex);
          let targetColor = 'rgba(255,255,255,0.2)';
          let targetOpacity = '1';
          let targetFilter = `blur(${distance}px)`;
          let targetScale = 1;

          if (performanceMode) {
            targetColor = isHighlight ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.32)';
            targetOpacity = String(Math.max(isHighlight ? 1 : 0.24, 0.92 - distance * 0.14));
            targetFilter = 'none';
          } else if (previewMode) {
            const fadeOpacity = Math.max(0.18, 0.72 - distance * 0.12);
            targetColor = isHighlight ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.34)';
            targetOpacity = isHighlight ? '1' : String(fadeOpacity);
            targetFilter = `blur(${isHighlight ? 0 : Math.min(3.2, 1.2 + distance * 0.6)}px)`;
            targetScale = isHighlight ? 1.03 : Math.max(0.935, 0.985 - distance * 0.016);
          } else {
              const maxBlur = 6;
              const hideBeyond = 12;
              if (distance > hideBeyond) {
                  targetOpacity = '0';
                  targetFilter = 'none';
              } else {
                  targetOpacity = (1 - distance / (hideBeyond + 2)).toFixed(2);
                  const blurPx = Math.min(distance * 0.8, maxBlur);
                  targetFilter = `blur(${blurPx}px)`;
              }
              targetColor = isHighlight ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.2)';
          }

          const targetTransform = previewMode
            ? `translate3d(0, ${GetLyricsLayout(mainIndex, i, data)}px, 0) scale(${targetScale})`
            : `translateY(${GetLyricsLayout(mainIndex, i, data)}px)`;

          if (ele.__lyricsHighlight !== isHighlight) {
            ele.classList.toggle('highlight', isHighlight);
            ele.__lyricsHighlight = isHighlight;
          }
          if (ele.__lyricsColor !== targetColor) {
            ele.style.color = targetColor;
            ele.__lyricsColor = targetColor;
          }
          if (ele.__lyricsOpacity !== targetOpacity) {
            ele.style.opacity = targetOpacity;
            ele.__lyricsOpacity = targetOpacity;
          }
          if (ele.__lyricsFilter !== targetFilter) {
            ele.style.filter = targetFilter;
            ele.__lyricsFilter = targetFilter;
          }

          if (ele.__lyricsTransform !== targetTransform) {
            if (ele.__lyricsTransformTimer) {
              clearTimeout(ele.__lyricsTransformTimer);
              ele.__lyricsTransformTimer = 0;
            }

            let n = (i - mainIndex) + 1;
            if (n > 10) n = 0;
            const baseDelay = init && !performanceMode ? (isMobile() ? 20 : 60) : 0;
            const delay = Math.max(0, n * baseDelay);

            if (delay > 0) {
              ele.__lyricsTransformTimer = setTimeout(() => {
                if (data[i] && data[i].ele === ele) {
                  ele.style.transform = targetTransform;
                  ele.__lyricsTransform = targetTransform;
                }
                ele.__lyricsTransformTimer = 0;
              }, delay);
            } else {
              ele.style.transform = targetTransform;
              ele.__lyricsTransform = targetTransform;
            }
          }
        }
      });
    }

    function updateAMLyricsHighlight(currentTime) {
      if (!amLyricsData.length) return;

      const activeIndex = findActiveLyricIndex(currentTime);
      if (activeIndex === -1 || lastLyric === activeIndex) return;

      if (lastLyric >= 0 && lastLyric < amLyricsData.length && lastLyric !== activeIndex) {
          const prevLine = amLyricsData[lastLyric];
          if (prevLine?.ele) {
              const prevSpans = prevLine.wordSpans || (prevLine.wordSpans = Array.from(prevLine.ele.querySelectorAll('span.word-lyric[data-wstart][data-wend]')));
              prevSpans.forEach(span => {
                  span.classList.remove('active-word');
                  span.__wordWasActive = false;
                  span.style.setProperty('--p', '0%');
                  span.__lastProgress = 0;
                  span.style.transform = 'translateY(0)';
                  span.style.transition = '';
                  delete span.__currentLift;
              });
          }
      }

      const THRESHOLD = 0.4;
      let minIdx = activeIndex;
      let maxIdx = activeIndex;

      while (maxIdx + 1 < amLyricsData.length) {
        const diff = amLyricsData[maxIdx + 1].time - amLyricsData[maxIdx].time;
        if (diff < THRESHOLD) {
          maxIdx++;
        } else {
          break;
        }
      }
      while (minIdx - 1 >= 0) {
        const diff = amLyricsData[minIdx].time - amLyricsData[minIdx - 1].time;
        if (diff < THRESHOLD) {
          minIdx--;
        } else {
          break;
        }
      }

      const highlightIndices = [];
      for (let i = minIdx; i <= maxIdx; i++) {
        highlightIndices.push(i);
      }

      const scrollBaseIndex = maxIdx;
      let useDelay = true;
      if (lastLyric >= 0 && lastLyric < amLyricsData.length) {
          const prevLine = amLyricsData[lastLyric];
          if (prevLine?.ele) {
              const prevSpans = prevLine.wordSpans || (prevLine.wordSpans = Array.from(prevLine.ele.querySelectorAll('span.word-lyric[data-wstart][data-wend]')));
              prevSpans.forEach(span => {
                  if (span.__lastWordProgress !== 0) {
                      span.style.setProperty('--p', '0%');
                      span.__lastWordProgress = 0;
                  }
                  span.__wordWasActive = false;
                  span.classList.remove('active-word', 'word-jump');
                  span.style.transition = '';
                  if (span.__lastLiftTransform !== 'translateY(0)') {
                      span.style.transform = '';
                      span.__lastLiftTransform = 'translateY(0)';
                  }
              });
          }
      }

      UpdateLyricsLayout(scrollBaseIndex, highlightIndices, amLyricsData, useDelay ? 1 : 0);
      lastLyric = activeIndex;

      const lyricText = amLyricsData[activeIndex] ? amLyricsData[activeIndex].text : '';
      if (lyricText && lyricText.trim() !== '') {
        document.title = lyricText;
      } else {
        updatePageTitle();
      }
    }

    amLyrics.addEventListener('click', e => {
      if (isMobile()) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const target = e.target.closest('.item');
      if (!target) return;
      const t = parseFloat(target.dataset.time);
      if (isNaN(t) || t < 0) return;

      try {
        audioPlayer.currentTime = t;
        if (audioPlayer.paused) {
          audioPlayer.play().then(() => {
            playButton.innerHTML = '<i class="fas fa-pause"></i>';
            isPlaying = true;
            updatePageTitle();
          }).catch(() => {});
        }
      } catch (err) {
        console.error("Error setting currentTime:", err);
      }
    });

    // ===== 事件监听器 =====
    function showLoading() {
      loadingIndicator.style.display = 'flex';
    }

    function hideLoading() {
      loadingIndicator.style.display = 'none';
    }

    dynamicIsland.addEventListener('click', handleDynamicIslandClick);
    dynamicIslandClose.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDynamicIsland();
    });

    desktopLyricsBtn.addEventListener('click', () => {
      connectDesktopLyrics();
    });

    settingsToggle.addEventListener('click', () => {
      settingsModalOverlay.classList.add('active');
      document.body.classList.add('settings-modal-open');
    });

    settingsModalClose.addEventListener('click', () => {
      settingsModalOverlay.classList.remove('active');
      document.body.classList.remove('settings-modal-open');
      stopKugouQrPolling();
    });

    settingsModalOverlay.addEventListener('click', (e) => {
      if (e.target === settingsModalOverlay) {
        settingsModalOverlay.classList.remove('active');
        document.body.classList.remove('settings-modal-open');
        stopKugouQrPolling();
      }
    });

    saveSettingsBtn.addEventListener('click', () => {
      saveTranslationSettings();
      saveVisualSettings();
    });

    if (eqEnabledToggle) {
      eqEnabledToggle.addEventListener('change', async (e) => {
        await setEqEnabled(e.target.checked);
      });
    }

    if (eqPresetSelect) {
      eqPresetSelect.addEventListener('change', (e) => {
        applyEqPreset(e.target.value);
      });
    }

    if (eqPreampSlider) {
      eqPreampSlider.addEventListener('input', (e) => {
        eqSettings.preamp = clamp(parseFloat(e.target.value), -12, 12);
        eqPreampValue.textContent = formatDbLabel(eqSettings.preamp);
        eqSettings.preset = 'custom';
        persistAndRefreshEqUi();
      });
    }

    eqBandSliders.forEach(slider => {
      slider.addEventListener('input', (e) => {
        const index = Number(e.target.dataset.bandIndex);
        if (!Number.isInteger(index)) return;
        eqSettings.bands[index] = clamp(parseFloat(e.target.value), -12, 12);
        const valueEl = document.querySelector(`.eq-band-value[data-band-value="${index}"]`);
        if (valueEl) valueEl.textContent = formatDbLabel(eqSettings.bands[index]);
        eqSettings.preset = 'custom';
        persistAndRefreshEqUi();
      });
    });

    if (eqResetBtn) {
      eqResetBtn.addEventListener('click', () => {
        applyEqPreset('flat');
      });
    }

    audioPlayer.addEventListener('play', async () => {
      if (!eqSettings.enabled) return;
      try {
        const support = await canEnableEqForCurrentSource();
        if (!support.ok) {
          eqSettings.enabled = false;
          persistAndRefreshEqUi();
          showError(`当前音源不支持浏览器均衡器，已自动关闭：${support.reason}`, 4800);
          return;
        }
        await ensureEqAudioGraph();
        applyEqToGraph();
      } catch (error) {
        console.warn('播放时恢复均衡器失败:', error);
      }
    });

    testApiBtn.addEventListener('click', async () => {
        const token = apiTokenInput.value.trim();
        if (!token) {
            showError('请输入API令牌', 2000);
            return;
        }

        try {
            showError('测试API连接中...', 2000);
            const response = await wrappedFetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    model: 'GLM-4.7-Flash',
                    messages: [{ role: 'user', content: '你好' }],
                    stream: false,
                    max_tokens: 10
                })
            });

            if (response.ok) {
                showError('API连接成功', 2000);
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            showError(`API连接失败: ${error.message}`, 3000);
        }
    });

    searchButton.addEventListener('click', () => searchMusic(searchInput.value.trim()));
    searchInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') searchMusic(searchInput.value.trim());
    });

    if (lyricsToggleBtn) lyricsToggleBtn.addEventListener('click', toggleLyrics);
    lyricsRerequestBtn.addEventListener('click', openLyricsRerequestDialog);
    lyricsRerequestCancelBtn.addEventListener('click', closeLyricsRerequestDialog);
    lyricsRerequestModalOverlay.addEventListener('click', (e) => {
      if (e.target === lyricsRerequestModalOverlay) closeLyricsRerequestDialog();
    });
    lyricsRerequestConfirmBtn.addEventListener('click', async () => {
      await handleLyricsRerequest();
    });

    playButton.addEventListener('click', () => {
      clearError();
      if (audioPlayer.paused) {
        audioPlayer.play().then(() => {
          playButton.innerHTML = '<i class="fas fa-pause"></i>';
          isPlaying = true;
          updatePageTitle();
        }).catch(e => {
          showError('播放失败: ' + e.message);
        });
      } else {
        audioPlayer.pause();
        playButton.innerHTML = '<i class="fas fa-play"></i>';
        isPlaying = false;
        updatePageTitle();
      }
    });

    prevButton.addEventListener('click', async () => {
      if (guardSongSwitch()) return;
      if (!currentPlayingId || playlist.length === 0) {
        showError('播放列表为空，无法切换歌曲');
        return;
      }

      const prevSongId = getPrevSongId(currentPlayingId);
      if (!prevSongId) {
        showError('无法获取上一首歌曲');
        return;
      }

      const prevSong = getSongById(prevSongId);
      if (prevSong) {
        await playSong(prevSong, true);
      } else {
        showError('无法找到上一首歌曲');
      }
    });

    nextButton.addEventListener('click', async () => {
      if (guardSongSwitch()) return;
      if (!currentPlayingId || playlist.length === 0) {
        showError('播放列表为空，无法切换歌曲');
        return;
      }

      const nextSongId = getNextSongId(currentPlayingId, true);
      if (!nextSongId) {
        showError('无法获取下一首歌曲');
        return;
      }

      const nextSong = getSongById(nextSongId);
      if (nextSong) {
        await playSong(nextSong, true);
      } else {
        showError('无法找到下一首歌曲');
      }
    });

    progressBar.addEventListener('click', e => {
      const rect = progressBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percent = clickX / rect.width;
      const duration = audioPlayer.duration;
      if (duration && !isNaN(duration)) {
        audioPlayer.currentTime = percent * duration;
      }
    });

    let lastLyricUpdate = 0;

    function throttledUpdateAMLyricsHighlight(currentTime) {
      updateAMLyricsHighlight(currentTime);
    }

    audioPlayer.addEventListener('timeupdate', () => {
      const currentTime = audioPlayer.currentTime || 0;
      const duration = audioPlayer.duration || 0;
      if (duration && !isNaN(duration)) {
        const progressPercent = Math.min(100, Math.max(0, Math.round((currentTime / duration) * 1000) / 10));
        if (progressPercent !== lastRenderedProgressPercent) {
          progress.style.width = `${progressPercent}%`;
          lastRenderedProgressPercent = progressPercent;
        }

        // 侧边栏迷你进度条
        const sidebarFill = document.getElementById('sidebarItemProgressFill');
        if (sidebarFill) {
          sidebarFill.style.width = `${progressPercent}%`;
        }

        updatePipProgress(progressPercent);

        const currentSecond = Math.floor(currentTime);
        if (currentSecond !== lastRenderedCurrentSecond) {
          currentTimeDisplay.textContent = formatTime(currentTime);
          lastRenderedCurrentSecond = currentSecond;
        }

        const durationSecond = Math.floor(duration);
        if (durationSecond !== lastRenderedDurationSecond) {
          durationDisplay.textContent = formatTime(duration);
          lastRenderedDurationSecond = durationSecond;
        }

        throttledUpdateAMLyricsHighlight(currentTime);

        if (!wordLyricRAF) {
          updateWordFillInActiveLine(currentTime, true);
        }

        sendCurrentTimeToDesktop(currentTime);
      }
    });

    audioPlayer.addEventListener('seeked', () => {
        const currentTime = audioPlayer.currentTime || 0;
        lastWordLyricTime = -1;
        lastWordLyricLineIndex = -1;
        let targetIdx = findActiveLyricIndex(currentTime);
        if (targetIdx === -1 && amLyricsData.length > 0) targetIdx = 0;
        resetAllWordsProgress(targetIdx);
        if (amLyricsData.length) {
            rebuildLyricsMetrics(amLyricsData);
        }
        let newActiveIndex = findActiveLyricIndex(currentTime);
        if (newActiveIndex === -1 && amLyricsData.length > 0) {
            newActiveIndex = 0;
        }
        if (newActiveIndex !== -1 && amLyricsData.length) {
            UpdateLyricsLayout(newActiveIndex, [newActiveIndex], amLyricsData, 0);
            lastLyric = newActiveIndex;
        }
        throttledUpdateAMLyricsHighlight(currentTime);
        updateWordFillInActiveLine(currentTime, false);
        const duration = audioPlayer.duration || 0;
        if (duration && !isNaN(duration)) {
            const percent = (currentTime / duration) * 100;
            progress.style.width = `${percent}%`;
            lastRenderedProgressPercent = percent;
        }
        currentTimeDisplay.textContent = formatTime(currentTime);
    });

    audioPlayer.addEventListener('ended', async () => {
        playButton.innerHTML = '<i class="fas fa-play"></i>';
        isPlaying = false;
        updatePageTitle();
        updateCollapsedText('Harmonia');
        if (!currentPlayingId) {
            currentPlayingId = null;
            currentSongData = null;
            return;
        }

        if (currentPlayMode === 'repeat') {
          try {
            audioPlayer.currentTime = 0;
            await audioPlayer.play();
            playButton.innerHTML = '<i class="fas fa-pause"></i>';
            isPlaying = true;
            updatePageTitle();
            if (collapsedTextSpan) {
              if (dynamicIslandToastTimer) {
                clearTimeout(dynamicIslandToastTimer);
                dynamicIslandToastTimer = null;
              }
              delete collapsedTextSpan.dataset.toastActive;
              collapsedTextSpan.textContent = '正在播放';
              resetDynamicIslandCollapsedWidth();
            }
          } catch (e) {
            console.error('单曲循环自动播放失败:', e);
            currentPlayingId = null;
            playButton.innerHTML = '<i class="fas fa-play"></i>';
            isPlaying = false;
            updatePageTitle();
            if (collapsedTextSpan && !collapsedTextSpan.dataset.toastActive) {
              collapsedTextSpan.textContent = 'Harmonia';
              resetDynamicIslandCollapsedWidth();
            }
          }
        }
    });

    audioPlayer.addEventListener('loadedmetadata', () => {
      const currentTime = audioPlayer.currentTime || 0;
      const duration = audioPlayer.duration || 0;
      currentTimeDisplay.textContent = formatTime(currentTime);
      durationDisplay.textContent = formatTime(duration);
      lastRenderedCurrentSecond = Math.floor(currentTime);
      lastRenderedDurationSecond = Math.floor(duration);
      lastRenderedProgressPercent = duration && !isNaN(duration)
        ? Math.min(100, Math.max(0, Math.round((currentTime / duration) * 1000) / 10))
        : -1;
    });

    audioPlayer.addEventListener('play', () => {
      isPlaying = true;
      playButton.innerHTML = '<i class="fas fa-pause"></i>';
      updatePageTitle();
      if (collapsedTextSpan?.dataset.toastActive) {
        delete collapsedTextSpan.dataset.toastActive;
        if (dynamicIslandToastTimer) {
          clearTimeout(dynamicIslandToastTimer);
          dynamicIslandToastTimer = null;
        }
      }
      if (!collapsedTextSpan?.dataset.toastActive) {
        setCollapsedTextAnimated('正在播放');
      } else {
        collapsedTextSpan.textContent = '正在播放';
        resetDynamicIslandCollapsedWidth();
      }
    });

    audioPlayer.addEventListener('pause', () => {
      isPlaying = false;
      playButton.innerHTML = '<i class="fas fa-play"></i>';
      updatePageTitle();
      if (!collapsedTextSpan?.dataset.toastActive) {
        setCollapsedTextAnimated('Harmonia');
      }
    });

    volumeSlider.addEventListener('input', debounce((e) => {
      audioPlayer.volume = parseFloat(e.target.value);
      localStorage.setItem('musicPlayerVolume', audioPlayer.volume);
    }, 50));

    menuToggle.addEventListener('click', openSidebar);
    sidebarClose.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);

    sidebarTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        sidebarTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentTab = tab.dataset.tab;
        currentActivePlaylist = getActivePlaylistArray();

        // 切换标签页时退出删除模式并清除选中状态
        isPlaylistDeleteMode = false;
        playlistSelected.clear();

        sidebarSearchQuery = '';
        sidebarSortMode = 'none';
        sidebarSourceFilter = null;
        const searchInput = document.getElementById('sidebarSearchInput');
        if (searchInput) {
          searchInput.value = '';
        }

        updateSortButtons();
        updateBatchRemoveButton();

        if (currentTab === 'playlist') {
          updatePlaylistOrder();
        }

        renderPlaylist();
      });
    });

    clearPlaylist.addEventListener('click', clearCurrentTabItems);
    themeToggle.addEventListener('click', toggleTheme);

    playModeBtn.addEventListener('click', () => {
      const modes = ['normal', 'repeat', 'shuffle'];
      const icons = ['fa-redo', 'fa-repeat', 'fa-random'];
      const titles = ['循环播放', '单曲循环', '随机播放'];
      const idx = modes.indexOf(currentPlayMode);
      const next = (idx + 1) % modes.length;
      currentPlayMode = modes[next];
      playModeBtn.innerHTML = `<i class="fas ${icons[next]}"></i>`;
      playModeBtn.title = titles[next];
      showDynamicIslandToast(`播放模式已切换为: ${titles[next]}`, 2000);
    });

    saveWallpaperBtn.addEventListener('click', () => {
      if (albumArt.src && albumArt.src !== 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7') {
        const a = document.createElement('a');
        a.href = albumArt.src;
        a.download = `Harmonia_AlbumArt_${new Date().getTime()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showError('专辑封面已保存！', 1500);
      } else {
        showError('暂无专辑封面可保存', 1500);
      }
    });

    shareMusicBtn.addEventListener('click', () => {
      if (playlist.length === 0) {
        showError('播放列表为空，无法分享');
        return;
      }
      createShareModal();
    });

    function handleAlbumMouseMove(e) {
        pendingAlbumTilt = { clientX: e.clientX, clientY: e.clientY };
        if (albumTiltRAF) return;

        albumTiltRAF = requestAnimationFrame(() => {
            albumTiltRAF = 0;
            if (!pendingAlbumTilt) return;
            const rect = albumArtContainer.getBoundingClientRect();
            const x = pendingAlbumTilt.clientX - rect.left;
            const y = pendingAlbumTilt.clientY - rect.top;
            pendingAlbumTilt = null;
            const cx = rect.width / 2, cy = rect.height / 2;
            const ry = (x - cx) / 15;
            const rx = (cy - y) / 15;
            albumArtContainer.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`;
        });
    }

    function handleAlbumMouseLeave() {
        pendingAlbumTilt = null;
        if (albumTiltRAF) {
            cancelAnimationFrame(albumTiltRAF);
            albumTiltRAF = 0;
        }
        albumArtContainer.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    }

    function applyEffectListener() {
        if (isMobile()) {
            if (albumMouseMoveHandler) {
                albumArtContainer.removeEventListener('mousemove', albumMouseMoveHandler);
                albumArtContainer.removeEventListener('mouseleave', albumMouseLeaveHandler);
                albumMouseMoveHandler = null;
                albumMouseLeaveHandler = null;
            }
            albumArtContainer.style.transform = '';
            return;
        }

        const isEnabled = localStorage.getItem(ALBUM_KEY) === 'true';
        if (isEnabled) {
            if (!albumMouseMoveHandler) {
                albumMouseMoveHandler = handleAlbumMouseMove;
                albumMouseLeaveHandler = handleAlbumMouseLeave;
                albumArtContainer.addEventListener('mousemove', albumMouseMoveHandler);
                albumArtContainer.addEventListener('mouseleave', albumMouseLeaveHandler);
            }
        } else {
            if (albumMouseMoveHandler) {
                albumArtContainer.removeEventListener('mousemove', albumMouseMoveHandler);
                albumArtContainer.removeEventListener('mouseleave', albumMouseLeaveHandler);
                albumMouseMoveHandler = null;
                albumMouseLeaveHandler = null;
            }
            albumArtContainer.style.transform = '';
        }
    }

    // ===== 分享模态框 =====
    let shareModalOverlay = null;

    function createShareModal() {
      if (!shareModalOverlay) {
        shareModalOverlay = document.createElement('div');
        shareModalOverlay.className = 'modal-overlay';
        shareModalOverlay.id = 'shareModalOverlay';
        shareModalOverlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
        `;

        const box = document.createElement('div');
        box.className = 'modal-content';
        box.style.cssText = `
          background: var(--card-bg-dark);
          border-radius: 24px;
          padding: 30px;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transform: translateY(20px);
          transition: transform 0.3s ease;
        `;

        const title = document.createElement('h2');
        title.textContent = '分享歌曲';
        title.style.cssText = `
          color: var(--primary-color);
          margin: 0 0 20px 0;
          font-size: 24px;
          font-weight: 700;
        `;

        const tip = document.createElement('p');
        tip.textContent = '选择要分享的歌曲（可多选），然后点击"导出分享文件"按钮';
        tip.style.cssText = `
          margin: 0 0 20px 0;
          color: var(--text-muted-dark);
          font-size: 14px;
          line-height: 1.5;
        `;

        const selectAllWrapper = document.createElement('div');
        selectAllWrapper.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          margin-bottom: 10px;
          background: rgba(255,255,255,0.03);
          border-radius: 12px;
        `;
        const selectAllLabel = document.createElement('label');
        selectAllLabel.style.cssText = `
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 14px;
          color: var(--text-muted-dark);
        `;
        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.id = 'shareSelectAll';
        selectAllCheckbox.style.cssText = `
          width: 18px;
          height: 18px;
          accent-color: var(--primary-color);
          cursor: pointer;
        `;
        const selectAllText = document.createElement('span');
        selectAllText.textContent = '全选';
        selectAllLabel.appendChild(selectAllCheckbox);
        selectAllLabel.appendChild(selectAllText);
        selectAllWrapper.appendChild(selectAllLabel);

        const selectedCountSpan = document.createElement('span');
        selectedCountSpan.style.cssText = `
          font-size: 12px;
          color: var(--primary-color);
        `;
        selectedCountSpan.textContent = '0 首已选';
        selectAllWrapper.appendChild(selectedCountSpan);

        const list = document.createElement('div');
        list.className = 'modal-song-list';
        list.id = 'shareSongList';
        list.style.cssText = `
          flex: 1;
          overflow-y: auto;
          margin-bottom: 20px;
          max-height: 300px;
        `;

        const btnsContainer = document.createElement('div');
        btnsContainer.className = 'modal-buttons';
        btnsContainer.style.cssText = `
          display: flex;
          gap: 12px;
          margin-top: 20px;
        `;

        const btnExport = document.createElement('button');
        btnExport.textContent = '导出分享文件';
        btnExport.style.cssText = `
          flex: 1;
          padding: 14px;
          background: var(--primary-gradient);
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 15px;
          transition: all 0.2s ease;
        `;
        btnExport.addEventListener('click', () => {
          const selected = [...shareModalOverlay.querySelectorAll('.modal-song-row input[type="checkbox"]:checked')].map(cb => playlist[parseInt(cb.dataset.index)]);
          if (selected.length === 0) {
            showError('请至少选择一首歌曲');
            return;
          }
          exportSongs(selected);
          hideShareModal();
        });

        const btnImport = document.createElement('button');
        btnImport.textContent = '导入分享文件';
        btnImport.style.cssText = `
          flex: 1;
          padding: 14px;
          background: var(--secondary-gradient);
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 15px;
          transition: all 0.2s ease;
        `;
        btnImport.addEventListener('click', () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json,.txt';
          input.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
              try {
                const imported = JSON.parse(ev.target.result);
                if (Array.isArray(imported)) {
                  const add = imported.filter(x => !playlist.some(y => y.id === x.id));
                  if (add.length > 0) {
                    playlist = [...playlist, ...add];
                    savePlaylist();
                    if (currentTab === 'playlist') renderPlaylist();
                    showError(`成功导入 ${add.length} 首歌曲`);
                  } else {
                    showError('没有新歌曲可以导入');
                  }
                } else {
                  showError('无效的分享文件');
                }
              } catch {
                showError('无法解析分享文件');
              }
            };
            reader.readAsText(file);
          });
          input.click();
          hideShareModal();
        });

        const btnClose = document.createElement('button');
        btnClose.textContent = '取消';
        btnClose.style.cssText = `
          flex: 1;
          padding: 14px;
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-dark);
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 15px;
          transition: all 0.2s ease;
        `;
        btnClose.addEventListener('click', hideShareModal);

        btnsContainer.appendChild(btnExport);
        btnsContainer.appendChild(btnImport);
        btnsContainer.appendChild(btnClose);

        box.appendChild(title);
        box.appendChild(tip);
        box.appendChild(selectAllWrapper);
        box.appendChild(list);
        box.appendChild(btnsContainer);

        shareModalOverlay.appendChild(box);
        shareModalOverlay.style.display = 'none';
        document.body.appendChild(shareModalOverlay);

        shareModalOverlay.addEventListener('click', e => {
          if (e.target === shareModalOverlay) {
            hideShareModal();
          }
        });

        shareModalOverlay._selectAllCheckbox = selectAllCheckbox;
        shareModalOverlay._selectedCountSpan = selectedCountSpan;
        shareModalOverlay._list = list;
      }

      const list = shareModalOverlay._list;
      const selectAllCheckbox = shareModalOverlay._selectAllCheckbox;
      const selectedCountSpan = shareModalOverlay._selectedCountSpan;

      list.innerHTML = '';
      const fragment = document.createDocumentFragment();
      playlist.forEach((song, idx) => {
        const row = document.createElement('div');
        row.className = 'modal-song-row';
        row.style.cssText = `
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 12px;
          margin-bottom: 8px;
          background: rgba(255, 255, 255, 0.05);
          cursor: pointer;
          transition: all 0.2s ease;
        `;

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.dataset.index = idx;
        cb.style.cssText = `
          width: 18px;
          height: 18px;
          accent-color: var(--primary-color);
          cursor: pointer;
        `;

        const info = document.createElement('div');
        info.style.cssText = 'flex: 1;';

        const st = document.createElement('div');
        st.textContent = song.name || '未知歌曲';
        st.style.cssText = `
          font-weight: 600;
          font-size: 15px;
          margin-bottom: 4px;
          color: var(--text-dark);
        `;

        const sa = document.createElement('div');
        sa.textContent = Array.isArray(song.artist) ? song.artist.join('、') : (song.artist || '未知歌手');
        sa.style.cssText = `
          font-size: 13px;
          color: var(--text-muted-dark);
        `;

        info.appendChild(st);
        info.appendChild(sa);
        row.appendChild(cb);
        row.appendChild(info);

        row.addEventListener('click', e => {
          if (e.target !== cb) cb.checked = !cb.checked;
          cb.dispatchEvent(new Event('change'));
        });

        fragment.appendChild(row);
      });
      list.appendChild(fragment);

      const songCheckboxes = Array.from(list.querySelectorAll('input[type="checkbox"]'));

      function updateSelectAllAndCount() {
        const allChecked = songCheckboxes.length > 0 && songCheckboxes.every(cb => cb.checked);
        selectAllCheckbox.checked = allChecked;
        const checkedCount = songCheckboxes.filter(cb => cb.checked).length;
        selectedCountSpan.textContent = `${checkedCount} 首已选`;
      }

      const oldHandler = selectAllCheckbox._handler;
      if (oldHandler) selectAllCheckbox.removeEventListener('change', oldHandler);
      const newHandler = () => {
        const isChecked = selectAllCheckbox.checked;
        songCheckboxes.forEach(cb => cb.checked = isChecked);
        updateSelectAllAndCount();
      };
      selectAllCheckbox._handler = newHandler;
      selectAllCheckbox.addEventListener('change', newHandler);

      songCheckboxes.forEach(cb => {
        const oldCbHandler = cb._handler;
        if (oldCbHandler) cb.removeEventListener('change', oldCbHandler);
        const cbHandler = updateSelectAllAndCount;
        cb._handler = cbHandler;
        cb.addEventListener('change', cbHandler);
      });

      updateSelectAllAndCount();

      shareModalOverlay.style.display = 'flex';
      setTimeout(() => {
        shareModalOverlay.style.opacity = '1';
        shareModalOverlay.style.visibility = 'visible';
        shareModalOverlay.querySelector('.modal-content').style.transform = 'translateY(0)';
      }, 10);
    }
    function hideShareModal() {
      if (shareModalOverlay) {
        shareModalOverlay.style.opacity = '0';
        shareModalOverlay.style.visibility = 'hidden';
        shareModalOverlay.querySelector('.modal-content').style.transform = 'translateY(20px)';
        setTimeout(() => {
          if (shareModalOverlay.style.opacity === '0') {
            shareModalOverlay.style.display = 'none';
          }
        }, 300);
      }
    }

    function exportSongs(songs) {
      const data = JSON.stringify(songs, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Harmonia音乐分享_${new Date().toLocaleDateString()}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      showError(`已导出 ${songs.length} 首歌曲！`, 2000);
    }

    function calculateLyricsOffset() {
      const lyricsContainer = document.querySelector('.lyricscontainer');
      let containerHeight = lyricsContainer ? lyricsContainer.offsetHeight : 0;

      if (containerHeight === 0) {
        containerHeight = window.innerHeight;
      }

      return containerHeight / 3.5;
    }

    // ===== 逐字歌词：平滑动画循环（rAF）=====
    let wordLyricRAF = 0;

    function startWordLyricLoop() {
      if (wordLyricRAF) return;

      const tick = () => {
        if (!audioPlayer.paused && !audioPlayer.ended) {
          const t = audioPlayer.currentTime || 0;
          updateWordFillInActiveLine(t);
          wordLyricRAF = requestAnimationFrame(tick);
        } else {
          stopWordLyricLoop();
        }
      };

      wordLyricRAF = requestAnimationFrame(tick);
    }

    function stopWordLyricLoop() {
      if (wordLyricRAF) {
        cancelAnimationFrame(wordLyricRAF);
        wordLyricRAF = 0;
      }
    }

    audioPlayer.addEventListener('play', startWordLyricLoop);
    audioPlayer.addEventListener('pause', stopWordLyricLoop);
    audioPlayer.addEventListener('ended', stopWordLyricLoop);
    audioPlayer.addEventListener('play', resumeAMLLPlayer);
    audioPlayer.addEventListener('pause', pauseAMLLPlayer);
    audioPlayer.addEventListener('ended', pauseAMLLPlayer);
    // 播放进度记忆：每 3 秒保存一次
    audioPlayer.addEventListener('timeupdate', () => {
      if (currentPlayingId && audioPlayer.currentTime > 0 && !audioPlayer.paused) {
        localStorage.setItem('lastPlayPosition', JSON.stringify({
          id: currentPlayingId,
          time: audioPlayer.currentTime,
          ts: Date.now()
        }));
      }
    });
    // 页面加载时恢复上次播放位置
    (function restorePlayPosition() {
      try {
        const saved = JSON.parse(localStorage.getItem('lastPlayPosition'));
        if (saved && saved.id && saved.time > 0 && Date.now() - saved.ts < 86400000) {
          audioPlayer._restoreTime = saved.time;
          audioPlayer._restoreId = saved.id;
        }
      } catch(e) {}
    })();
    audioPlayer.addEventListener('seeked', () => syncAMLLCurrentTime(true));
    window.addEventListener('resize', debounce(resizeAMLLPlayer, 120));

    function updatePlaylistOrder() {
      playlistOrder = playlist.map(item => item.id);
    }

    function getNextSongId(currentId, forceNext = false) {
        if (playlist.length === 0) return null;
        if (!currentId) return null;

        if (playlistOrder.length !== playlist.length) {
            updatePlaylistOrder();
        }
        if (playlistOrder.length === 0) return null;

        const currentIndex = playlistOrder.indexOf(currentId);
        if (currentIndex === -1) return null;

        if (!forceNext && currentPlayMode === 'repeat') {
            return currentId;
        } else if (currentPlayMode === 'shuffle') {
            const randomIndex = Math.floor(Math.random() * playlistOrder.length);
            return playlistOrder[randomIndex];
        } else {
            let nextIndex = currentIndex + 1;
            if (nextIndex >= playlistOrder.length) nextIndex = 0;
            return playlistOrder[nextIndex];
        }
    }

    function getPrevSongId(currentId) {
      if (!currentId || playlistOrder.length === 0) return null;

      const currentIndex = playlistOrder.indexOf(currentId);
      if (currentIndex === -1) return null;

      if (currentPlayMode === 'shuffle') {
        const randomIndex = Math.floor(Math.random() * playlistOrder.length);
        return playlistOrder[randomIndex];
      } else {
        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) {
          prevIndex = playlistOrder.length - 1; // 循环到最后一首
        }
        return playlistOrder[prevIndex];
      }
    }

    function getSongById(id) {
      return playlist.find(item => item.id === id)
        || currentSearchResults.find(item => item.id === id)
        || favorites.find(item => item.id === id)
        || history.find(item => item.id === id);
    }

    function getPlaylistIndexById(id) {
      return playlist.findIndex(item => item.id === id);
    }

    function loadVisualSettings() {
        const saved = localStorage.getItem(ALBUM_KEY);
        const isEnabled = saved === 'true';
        const toggle = document.getElementById('albumEffectToggle');
        if (toggle) {
            toggle.checked = isEnabled;
        }

        const savedLyricsAnimationMode = localStorage.getItem(LYRICS_ANIMATION_MODE_KEY) || 'visual';
        applyLyricsAnimationMode(savedLyricsAnimationMode, false);

        const savedControlsLayout = localStorage.getItem(PLAYER_CONTROLS_LAYOUT_KEY) || 'classic';
        applyPlayerControlsLayout(savedControlsLayout, false);
    }

    function saveVisualSettings() {
      const toggle = document.getElementById('albumEffectToggle');
      const isEnabled = toggle ? toggle.checked : false;
      localStorage.setItem(ALBUM_KEY, isEnabled);

      const selectedMode = document.querySelector('input[name="lyricsAnimationMode"]:checked')?.value || 'visual';
      applyLyricsAnimationMode(selectedMode);

      const selectedControlsLayout = document.querySelector('input[name="playerControlsLayout"]:checked')?.value || 'classic';
      applyPlayerControlsLayout(selectedControlsLayout);
      applyEffectListener();

      showDynamicIslandToast('视觉设置已保存', 2000);
    }

    // ===== 初始化 =====
    function init() {
        initTheme();
        loadTranslationSettings();
        initPlaylist();
        updateDynamicIslandWelcome();
        updatePlaylistOrder();
        currentPlayingId = null;
        if (nowPlayingArtist) {
          nowPlayingArtist.textContent = currentSongInfo.artist || '未知歌手';
        }
        loadVisualSettings();
        loadEqSettings();
        applyEffectListener();

        const initCollapsedText = () => {
          if (currentPlayingId) {
            collapsedTextSpan.textContent = '正在播放';
          } else {
            collapsedTextSpan.textContent = 'Harmonia';
          }
        };
        initCollapsedText();

        const albumToggle = document.getElementById('albumEffectToggle');
        if (albumToggle) {
            albumToggle.addEventListener('change', function() {
                localStorage.setItem(ALBUM_KEY, this.checked);
                applyEffectListener();
            });
        }

        if (enableWordLyricJump) {
            enableWordLyricJump.addEventListener('change', function() {
                applyWordLyricJumpSetting(this.checked, { persist: true, toast: true });
            });
        }

        lyricsRendererModeRadios.forEach(radio => {
            radio.addEventListener('change', async (e) => {
                if (!e.target.checked) return;
                await applyLyricsRendererMode(e.target.value, {
                  persist: true,
                  toast: true,
                  rerender: true
                });
            });
        });

        // TTML 歌词来源切换
        const amllTtmlSourceRadios = document.querySelectorAll('input[name="amllTtmlSource"]');
        const savedTtmlSource = localStorage.getItem(AMLL_TTML_SOURCE_KEY) || 'mirror';
        amllTtmlSourceRadios.forEach(radio => {
          if (radio.value === savedTtmlSource) radio.checked = true;
          radio.addEventListener('change', (e) => {
            if (!e.target.checked) return;
            const value = e.target.value;
            localStorage.setItem(AMLL_TTML_SOURCE_KEY, value);
            AMLL_TTML_DB_BASE = value === 'github' ? AMLL_TTML_DB_GITHUB : AMLL_TTML_DB_MIRROR;
            showDynamicIslandToast(
              value === 'github' ? 'TTML 来源已切换为 GitHub 社区库' : 'TTML 来源已切换为镜像站 (Bikonoo)',
              2200
            );
          });
        });

        document.querySelectorAll('input[name="lyricsAnimationMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (!e.target.checked) return;
                applyLyricsAnimationMode(e.target.value);
                const toastText = e.target.value === 'performance'
                  ? '已切换为性能优先歌词动画'
                  : (e.target.value === 'preview' ? '已切换为预览版本歌词动画' : '已切换为视觉优先歌词动画');
                showDynamicIslandToast(toastText, 2200);
            });
        });

        document.querySelectorAll('input[name="playerControlsLayout"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (!e.target.checked) return;
                applyPlayerControlsLayout(e.target.value);
                showDynamicIslandToast(
                  e.target.value === 'apple-music' ? '已切换为 Apple Music 播放控件' : '已切换为 Harmonia 经典控件',
                  2200
                );
            });
        });

        if (isMobile()) {
            desktopLyricsBtn.style.display = 'none';
            if (!lyricsVisible) {
                rightcontent.classList.add('hidden');
                if (lyricsToggleBtn) lyricsToggleBtn.innerHTML = '<i class="fas fa-align-left"></i>';
            }
            const toggle = document.getElementById('albumEffectToggle');
            if (toggle) {
                toggle.disabled = true;
                toggle.parentElement.parentElement.style.opacity = '0.6';
            }
        }

        LYRICS_OFFSET = calculateLyricsOffset();
        initSidebarControls();
        initDragAndDrop();

        musicSourceRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (!e.target.checked) return;
                applyMusicSource(e.target.value, { persist: true, toast: true });
            });
        });

        initKugouQualityAndVipSettings();

        function initWordLyricsSource() {
            const savedSource = localStorage.getItem('wordLyricsSource') || 'netease';
            const radios = document.querySelectorAll('input[name="wordLyricsSource"]');
            radios.forEach(radio => {
                if (radio.value === savedSource) {
                    radio.checked = true;
                }
                radio.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        localStorage.setItem('wordLyricsSource', e.target.value);
                        console.log('逐字歌词来源已保存:', e.target.value);
                    }
                });
            });
        }
        initWordLyricsSource();

        // 快捷键列表：点击标签页时动态填充
        (function initShortcutsList() {
          const listEl = document.getElementById('shortcutsList');
          if (!listEl) return;
          const shortcutsTab = document.querySelector('[data-tab="shortcuts"]');
          if (!shortcutsTab) return;
          const fillList = () => {
            if (listEl.children.length > 0) return; // 已填充则跳过
            if (typeof SHORTCUTS === 'undefined') return;
            const list = SHORTCUTS.map(s => {
              const key = s.key === ' ' ? 'Space' : s.key;
              return `<div style="display:flex;align-items:baseline;gap:10px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
                <span style="display:inline-block;min-width:75px;font-weight:700;color:var(--primary-color);font-size:13px;">${escapeHtml(key)}</span>
                <span style="color:rgba(255,255,255,0.7);">${escapeHtml(s.desc)}</span>
              </div>`;
            }).join('');
            listEl.innerHTML = list;
          };
          shortcutsTab.addEventListener('click', fillList);
        })();

        // 更新日志：从 GitHub Releases 获取并渲染
        (function initChangelog() {
          const container = document.getElementById('changelogContent');
          if (!container) return;
          const changelogTab = document.querySelector('[data-tab="changelog"]');
          if (!changelogTab) return;
          let loaded = false;
          const GITHUB_RELEASES_API = 'https://api.github.com/repos/beststoryilove/Harmonia-MusicPlayer/releases?per_page=10';

          function parseChangelog(body) {
            // 解析 Markdown 风格的更新日志为 HTML
            const sections = [];
            const lines = body.split('\n');
            let currentSection = null;
            let currentItems = [];
            let inCodeBlock = false;

            for (const line of lines) {
              if (line.startsWith('```')) { inCodeBlock = !inCodeBlock; continue; }
              if (inCodeBlock) continue;

              const h3 = line.match(/^###\s+(.+)/);
              const h2 = line.match(/^##\s+(.+)/);
              const li = line.match(/^\d+\.\s+(.+)/) || line.match(/^[-*]\s+(.+)/);
              // Markdown 图片: ![alt](url)
              const imgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
              // HTML img 标签: <img ... src="url" ... alt="text" ... />
              const htmlImgMatch = line.match(/<img[^>]*\bsrc\s*=\s*"([^"]*)"[^>]*\balt\s*=\s*"([^"]*)"[^>]*\/?>/i)
                                || line.match(/<img[^>]*\balt\s*=\s*"([^"]*)"[^>]*\bsrc\s*=\s*"([^"]*)"[^>]*\/?>/i);

              if (h2 || h3) {
                if (currentSection) {
                  sections.push({ title: currentSection, items: currentItems });
                }
                currentSection = (h2 || h3)[1];
                currentItems = [];
              } else if (imgMatch || htmlImgMatch) {
                const m = imgMatch || htmlImgMatch;
                let alt, url;
                if (imgMatch) { alt = m[1]; url = m[2]; }
                else if (htmlImgMatch) {
                  if (/^https?:\/\//i.test(m[1])) { url = m[1]; alt = m[2]; }
                  else { alt = m[1]; url = m[2]; }
                }
                alt = alt || '查看图片';
                url = url || '';
                // GitHub user-attachments 需要通过代理加载
                const proxyUrl = url.includes('github.com/user-attachments')
                  ? `https://cors.harmoniamusicplayer.dpdns.org/api/proxy?url=${encodeURIComponent(url)}`
                  : url;
                currentItems.push(`<img src="${proxyUrl.replace(/"/g,'&quot;')}" alt="${escapeHtml(alt)}" style="max-width:100%;border-radius:8px;margin:8px 0;" loading="lazy" referrerpolicy="no-referrer" />`);
              } else if (li) {
                currentItems.push(escapeHtml(li[1]));
              } else if (line.trim() && currentSection) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                  currentItems.push(escapeHtml(trimmed));
                }
              }
            }
            if (currentSection) {
              sections.push({ title: currentSection, items: currentItems });
            }
            return sections;
          }

          function renderRelease(release) {
            const date = new Date(release.published_at).toLocaleDateString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit' });
            const isPrerelease = release.prerelease;
            const badge = isPrerelease ? ' <span style="background:rgba(255,159,10,0.15);color:#ff9f0a;padding:1px 6px;border-radius:4px;font-size:10px;">预发布</span>' : '';
            const sections = parseChangelog(release.body || '');

            let html = `<div style="margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.06);">`;
            html += `<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:10px;">`;
            html += `<span style="font-weight:700;font-size:15px;color:var(--primary-color);">${escapeHtml(release.tag_name)}</span>`;
            html += badge;
            html += `<span style="font-size:11px;color:rgba(255,255,255,0.35);margin-left:auto;">${date}</span>`;
            html += `</div>`;

            if (sections.length === 0) {
              const safeBody = escapeHtml((release.body || '').slice(0, 500));
              html += `<div style="color:rgba(255,255,255,0.5);white-space:pre-wrap;">${safeBody}</div>`;
            } else {
              for (const sec of sections) {
                html += `<div style="margin-bottom:12px;">`;
                html += `<div style="font-weight:650;font-size:13px;color:rgba(255,255,255,0.8);margin-bottom:6px;">${escapeHtml(sec.title)}</div>`;
                if (sec.items.length) {
                  html += `<ul style="margin:0;padding-left:18px;">`;
                  for (const item of sec.items) {
                    // 图片项已包含 HTML，不转义；其他项已在上层做过 escapeHtml
                    const rendered = item.startsWith('<img') ? item : escapeHtml(item);
                    html += `<li style="margin-bottom:3px;font-size:12px;color:rgba(255,255,255,0.55);">${rendered}</li>`;
                  }
                  html += `</ul>`;
                }
                html += `</div>`;
              }
            }
            html += `</div>`;
            return html;
          }

          async function loadChangelog() {
            if (loaded) return;
            loaded = true;
            try {
              const res = await fetch(GITHUB_RELEASES_API, { headers: { 'Accept': 'application/vnd.github.v3+json' } });
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const releases = await res.json();
              if (!Array.isArray(releases) || releases.length === 0) throw new Error('无发布记录');
              container.innerHTML = releases.map(renderRelease).join('');
            } catch (e) {
              container.innerHTML = `<div style="text-align:center;padding:30px;color:rgba(255,255,255,0.35);">
                <i class="fas fa-exclamation-circle"></i> 加载失败：${escapeHtml(e.message)}<br>
                <a href="https://github.com/beststoryilove/Harmonia-MusicPlayer/releases" target="_blank" rel="noopener noreferrer" style="color:var(--primary-color);">在 GitHub 查看</a>
              </div>`;
            }
          }

          changelogTab.addEventListener('click', loadChangelog);
        })();

        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', function(e) {
                e.stopPropagation();
                document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                const target = this.dataset.tab;
                document.querySelectorAll('.settings-tab-content').forEach(content => content.classList.remove('active'));
                const activeContent = document.querySelector(`.settings-tab-content[data-tab="${target}"]`);
                if (activeContent) activeContent.classList.add('active');
            });
        });

        window.addEventListener('resize', debounce(() => {
            LYRICS_OFFSET = calculateLyricsOffset();
            if (amLyricsData.length > 0 && lastLyric >= 0) {
                UpdateLyricsLayout(lastLyric, [lastLyric], amLyricsData, 0);
            }
            if (!isMobile() && isMobileLyricsFullscreen) {
                document.body.classList.remove('mobile-lyrics-fullscreen');
                isMobileLyricsFullscreen = false;
            }
            refreshDynamicIslandToastLayout();
        }, 200));

        updateCollapsedText('Harmonia');
        updateKugouAccountUI();
    }

	      function initSidebarControls() {
        const sidebarSearchInput = document.getElementById('sidebarSearchInput');
        const sidebarSearchClear = document.getElementById('sidebarSearchClear');
        const sortAZBtn = document.getElementById('sortAZBtn');
        const sortZABtn = document.getElementById('sortZABtn');
        const customOrderBtn = document.getElementById('customOrderBtn');
        const filterNeteaseBtn = document.getElementById('filterNeteaseBtn');
        const filterKugouBtn = document.getElementById('filterKugouBtn');
        const sidebar = document.getElementById('sidebar');

        if (!sortAZBtn || !sortZABtn || !customOrderBtn) {
          console.warn('排序按钮元素未找到，跳过初始化');
          return;
        }

        if (sidebarSearchInput) {
          sidebarSearchInput.oninput = debounce((e) => {
            sidebarSearchQuery = e.target.value.trim().toLowerCase();
            if (sidebarSearchQuery && sidebarSortMode === 'custom') {
              sidebarSortMode = 'none';
              updateSortButtons();
            }
            renderPlaylist();
          }, 300);
        }

        if (sidebarSearchClear) {
          sidebarSearchClear.onclick = () => {
            if (sidebarSearchInput) {
              sidebarSearchInput.value = '';
              sidebarSearchQuery = '';
              renderPlaylist();
            }
          };
        }

        sortAZBtn.onclick = () => {
          sidebarSortMode = sidebarSortMode === 'az' ? 'none' : 'az';
          updateSortButtons();

          if (currentTab === 'playlist') {
            updatePlaylistOrderFromDisplay();
          }

          renderPlaylist();
        };

        sortZABtn.onclick = () => {
          sidebarSortMode = sidebarSortMode === 'za' ? 'none' : 'za';
          updateSortButtons();

          if (currentTab === 'playlist') {
            updatePlaylistOrderFromDisplay();
          }

          renderPlaylist();
        };

        customOrderBtn.onclick = () => {
          if (sidebarSearchQuery) {
            showError('搜索过滤时无法进行自定义排序', 1500);
            return;
          }
          if (sidebarSortMode === 'custom') {
            sidebarSortMode = 'none';
            showError('自定义排序已保存', 1500);
          } else {
            sidebarSortMode = 'custom';
            if (!customOrder[currentTab]) {
              customOrder[currentTab] = getActivePlaylistArray().map(item => item.id);
            }
          }
          updateSortButtons();

          if (currentTab === 'playlist') {
            updatePlaylistOrderFromDisplay();
          }

          renderPlaylist();
        };

        if (filterNeteaseBtn) {
          filterNeteaseBtn.onclick = () => {
            sidebarSourceFilter = sidebarSourceFilter === 'netease' ? null : 'netease';
            updateSortButtons();
            renderPlaylist();
          };
        }

        if (filterKugouBtn) {
          filterKugouBtn.onclick = () => {
            sidebarSourceFilter = sidebarSourceFilter === 'kugou' ? null : 'kugou';
            updateSortButtons();
            renderPlaylist();
          };
        }
      }

    function updatePlaylistOrderFromDisplay() {
      if (currentTab !== 'playlist') return;

      let displayedItems = playlist;

      if (sidebarSearchQuery) {
        displayedItems = displayedItems.filter(item => {
          const name = (item.name || '').toLowerCase();
          const artist = Array.isArray(item.artist) ?
            item.artist.join(' ').toLowerCase() :
            (item.artist || '').toLowerCase();
          return name.includes(sidebarSearchQuery) ||
                artist.includes(sidebarSearchQuery);
        });
      }

      if (sidebarSortMode === 'az') {
        displayedItems.sort((a, b) => {
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
      } else if (sidebarSortMode === 'za') {
        displayedItems.sort((a, b) => {
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          return nameB.localeCompare(nameA);
        });
      } else if (sidebarSortMode === 'custom' && customOrder.playlist) {
        const orderMap = {};
        customOrder.playlist.forEach((id, index) => {
          orderMap[id] = index;
        });

        displayedItems.sort((a, b) => {
          const orderA = orderMap[a.id] !== undefined ? orderMap[a.id] : Infinity;
          const orderB = orderMap[b.id] !== undefined ? orderMap[b.id] : Infinity;
          return orderA - orderB;
        });
      }

      playlistOrder = displayedItems.map(item => item.id);

      console.log('播放列表顺序已更新:', playlistOrder);
    }

    function updateSortButtons() {
      const sortAZBtn = document.getElementById('sortAZBtn');
      const sortZABtn = document.getElementById('sortZABtn');
      const customOrderBtn = document.getElementById('customOrderBtn');
      const filterNeteaseBtn = document.getElementById('filterNeteaseBtn');
      const filterKugouBtn = document.getElementById('filterKugouBtn');
      const sidebar = document.getElementById('sidebar');

      if (!sortAZBtn || !sortZABtn || !customOrderBtn) {
        console.warn('排序按钮元素未找到，无法更新按钮状态');
        return;
      }

      sortAZBtn.classList.remove('active');
      sortZABtn.classList.remove('active');
      customOrderBtn.classList.remove('active');
      sidebar.classList.remove('sidebar-sort-mode-custom');
      customOrderBtn.innerHTML = '<i class="fas fa-sliders-h"></i> 自定义';

      if (sidebarSortMode === 'az') {
        sortAZBtn.classList.add('active');
      } else if (sidebarSortMode === 'za') {
        sortZABtn.classList.add('active');
      } else if (sidebarSortMode === 'custom') {
        customOrderBtn.classList.add('active');
        sidebar.classList.add('sidebar-sort-mode-custom');
        customOrderBtn.innerHTML = '<i class="fas fa-check"></i> 完成';
      }

      if (filterNeteaseBtn) {
        filterNeteaseBtn.classList.toggle('active', sidebarSourceFilter === 'netease');
      }
      if (filterKugouBtn) {
        filterKugouBtn.classList.toggle('active', sidebarSourceFilter === 'kugou');
      }
    }
    try {
      init();
    } catch (err) {
      console.error('[init] 初始化失败:', err);
    }
    // 兜底：确保账号 UI 在脚本执行完毕后得到更新（覆盖 DOMContentLoaded 未触发的情况）
    try { updateKugouAccountUI(); } catch (e) { /* ignore */ }

    // ===== MV 请求与播放 =====
    let isLoadingMv = false;
    let currentMvVideoUrl = null;      // 当前加载的 MV 地址
    let isMvPlaying = false;            // 是否正在播放 MV（用于状态追踪）

    const mvButton = document.getElementById('mvButton');
    const mvModalOverlay = document.getElementById('mvModalOverlay');
    const mvModalClose = document.getElementById('mvModalClose');
    const mvFetchBtn = document.getElementById('mvFetchBtn');
    const mvModalTitle = document.getElementById('mvModalTitle');
    const mvVideoPlayer = document.getElementById('mvVideoPlayer');
    const mvPlaceholder = document.getElementById('mvPlaceholder');

    function setMvPlaceholder(message, isError = false) {
      mvPlaceholder.style.display = 'flex';
      mvVideoPlayer.style.display = 'none';
      mvPlaceholder.innerHTML = `
        <i class="fas ${isError ? 'fa-exclamation-triangle' : 'fa-film'}"></i>
        <p>${message}</p>
        ${!isError ? '<small>点击“解析当前歌曲MV”按钮开始加载</small>' : ''}
      `;
      if (isError) {
        mvPlaceholder.querySelector('i').style.color = 'var(--error-color)';
      } else {
        mvPlaceholder.querySelector('i').style.color = '';
      }
    }

    function showMvVideo(url) {
      currentMvVideoUrl = url;
      mvPlaceholder.style.display = 'none';
      mvVideoPlayer.style.display = 'block';
      mvVideoPlayer.src = url;
      mvVideoPlayer.load();
      mvVideoPlayer.play()
        .then(() => { isMvPlaying = true; })
        .catch(e => {
          console.warn('自动播放失败，可能需要用户交互', e);
          isMvPlaying = false;
        });
    }

    function stopCurrentMv() {
      if (mvVideoPlayer) {
        mvVideoPlayer.pause();
        mvVideoPlayer.src = '';
        currentMvVideoUrl = null;
        isMvPlaying = false;
      }
    }

    async function fetchAndPlayMV(songName, artistName) {
      if (isLoadingMv) {
        setMvPlaceholder('正在加载中，请稍后…', false);
        return;
      }
      isLoadingMv = true;

      if (audioPlayer && !audioPlayer.paused) {
        audioPlayer.pause();
        playButton.innerHTML = '<i class="fas fa-play"></i>';
        isPlaying = false;
        updatePageTitle();
      }

      setMvPlaceholder(`正在搜索《${songName}》的 MV…`);

      try {
        let firstArtist = artistName;
        if (firstArtist.includes('、') || firstArtist.includes(',') || firstArtist.includes('，')) {
          firstArtist = firstArtist.split(/[、,，]/)[0].trim();
        }
        const keyword = `${songName} ${firstArtist}`;
        const searchUrl = `https://api.harmoniamusicplayer.dpdns.org/cloudsearch?keywords=${encodeURIComponent(keyword)}&limit=1&type=1004&randomCNIP=true`;

        const searchRes = await wrappedFetch(searchUrl);
        if (!searchRes.ok) throw new Error(`搜索 MV 失败 (${searchRes.status})`);
        const searchData = await searchRes.json();

        const mvs = searchData?.result?.mvs;
        if (!mvs || mvs.length === 0) {
          throw new Error('未找到相关 MV');
        }

        const mvId = mvs[0].id;
        console.log('获取到 MV ID:', mvId);

        setMvPlaceholder('正在获取 MV 播放地址…');
        const mvUrlApi = `https://api.harmoniamusicplayer.dpdns.org/mv/url?id=${mvId}`;
        const urlRes = await wrappedFetch(mvUrlApi);
        if (!urlRes.ok) throw new Error(`获取 MV 地址失败 (${urlRes.status})`);
        const urlData = await urlRes.json();

        const mvUrl = urlData?.data?.url;
        if (!mvUrl) {
          throw new Error('MV 地址为空，可能该 MV 已失效');
        }

        console.log('MV 地址获取成功:', mvUrl);
        showMvVideo(mvUrl);

      } catch (error) {
        console.error('MV 播放失败:', error);
        setMvPlaceholder(`加载失败：${error.message}`, true);
      } finally {
        isLoadingMv = false;
      }
    }

    function openMvModal() {
      const songName = nowPlayingTitle.textContent !== '歌曲标题'
        ? nowPlayingTitle.textContent
        : '未播放歌曲';
      const artist = currentSongInfo.artist || '';
      mvModalTitle.textContent = `${songName} 的 MV`;

      if (currentMvVideoUrl && mvVideoPlayer.src && !mvVideoPlayer.paused) {
        mvPlaceholder.style.display = 'none';
        mvVideoPlayer.style.display = 'block';
      } else if (currentMvVideoUrl && mvVideoPlayer.src) {
        mvPlaceholder.style.display = 'none';
        mvVideoPlayer.style.display = 'block';
      } else {
        setMvPlaceholder(`当前暂无 MV，点击“解析当前歌曲 MV”按钮加载。`, false);
      }

      mvModalOverlay.classList.add('active');
    }

    function closeMvModal() {
      mvModalOverlay.classList.remove('active');
    }

    function handleFetchMv() {
      const songName = nowPlayingTitle.textContent !== '歌曲标题'
        ? nowPlayingTitle.textContent
        : '未播放歌曲';
      const artist = currentSongInfo.artist || '';

      if (songName === '未播放歌曲' || !artist) {
        setMvPlaceholder('暂无正在播放的歌曲，请先播放一首歌。', true);
        if (!mvModalOverlay.classList.contains('active')) {
          openMvModal();
        }
        return;
      }
      if (currentMvVideoUrl) {
        if (confirm('当前已有 MV 在播放，是否替换为新歌曲的 MV？')) {
          stopCurrentMv();
          fetchAndPlayMV(songName, artist);
        }
      } else {
        fetchAndPlayMV(songName, artist);
      }
    }

    if (mvButton) {
      mvButton.addEventListener('click', openMvModal);
    }
    if (mvModalClose) {
      mvModalClose.addEventListener('click', closeMvModal);
    }
    if (mvFetchBtn) {
      mvFetchBtn.addEventListener('click', handleFetchMv);
    }
    if (mvModalOverlay) {
      mvModalOverlay.addEventListener('click', (e) => {
        if (e.target === mvModalOverlay) closeMvModal();
      });
    }

    // ==================== 酷狗 API ====================

    async function sendKugouCaptcha(mobile) {
        const timestamp = Date.now();
        const url = `${KUGOU_API_BASE}/captcha/sent?mobile=${encodeURIComponent(mobile)}&timestamp=${timestamp}`;
        const res = await wrappedFetchWithRetry(url);
        if (!res.ok) throw new Error('发送验证码失败');
        const data = await res.json();
        if (data.status !== 1) throw new Error(data.msg || '发送失败');
        return data;
    }

    async function loginKugou(mobile, code) {
        const timestamp = Date.now();
        const url = `${KUGOU_API_BASE}/login/cellphone?mobile=${encodeURIComponent(mobile)}&code=${encodeURIComponent(code)}&timestamp=${timestamp}`;
        const res = await wrappedFetchWithRetry(url);
        if (!res.ok) throw new Error('登录请求失败');
        const data = await res.json();
        if (data.status !== 1) throw new Error(data.msg || '登录失败');
        const token = data.data.token;
        const userid = data.data.userid;
        const nickname = data.data.nickname;
        const pic = data.data.pic;
        localStorage.setItem('kugouToken', token);
        localStorage.setItem('kugouUserId', userid);
        if (nickname) localStorage.setItem('kugouNickname', nickname);
        if (pic) localStorage.setItem('kugouPic', pic);
        markKugouTokenIssued();
        kugouToken = token;
        kugouUserId = userid;
        return data;
    }

    async function ensureKugouDfid(forceRefresh = false) {
        if (!forceRefresh && kugouDfid) {
            return kugouDfid;
        }
        const res = await wrappedFetchWithRetry(`${KUGOU_API_BASE}/register/dev`, { credentials: 'include' });
        if (!res.ok) throw new Error('获取酷狗 dfid 失败');
        const data = await res.json();
        const dfid = data?.data?.dfid;
        if (!dfid) throw new Error('未获取到有效的 dfid');
        kugouDfid = String(dfid);
        localStorage.setItem('kugouDfid', kugouDfid);
        return kugouDfid;
    }

    function pickKugouPlayableUrl(payload) {
        if (!payload || typeof payload !== 'object') return '';
        // 优先使用 backupUrl（更稳定），再回退到 url
        if (Array.isArray(payload.backupUrl) && payload.backupUrl.length > 0 && payload.backupUrl[0]) return String(payload.backupUrl[0]).trim();
        if (typeof payload.url === 'string' && payload.url.trim()) return payload.url.trim();
        if (Array.isArray(payload.url) && payload.url.length > 0 && payload.url[0]) return String(payload.url[0]).trim();
        return '';
    }

    function isKugouNeedRefreshDfid(payload) {
        const msg = `${payload?.error_msg || ''} ${payload?.msg || ''}`.toLowerCase();
        return msg.includes('验证') || msg.includes('dfid') || msg.includes('verify');
    }

    async function fetchKugouSongUrlByHash(hash, dfid, quality = getKugouAudioQuality()) {
        const normalizedQuality = normalizeKugouQuality(quality);
        const timestamp = Date.now();
        const url = `${KUGOU_API_BASE}/song/url?hash=${encodeURIComponent(hash)}&dfid=${encodeURIComponent(dfid)}&token=${encodeURIComponent(kugouToken)}&quality=${encodeURIComponent(normalizedQuality)}&timestamp=${timestamp}`;
        const res = await wrappedFetchWithRetry(url, { credentials: 'include' });
        if (!res.ok) throw new Error('酷狗 URL 请求失败');
        return await res.json();
    }

    async function getKugouAudioUrlByHash(hash) {
        if (!kugouToken) throw new Error('请先在设置-账户中登录酷狗账号');
        if (!hash) throw new Error('缺少酷狗歌曲 hash');

        const requestedQuality = getKugouAudioQuality();
        let dfid = await ensureKugouDfid(false);
        let payload = await fetchKugouSongUrlByHash(hash, dfid, requestedQuality);
        let finalUrl = pickKugouPlayableUrl(payload);

        if (!finalUrl && isKugouNeedRefreshDfid(payload)) {
            dfid = await ensureKugouDfid(true);
            payload = await fetchKugouSongUrlByHash(hash, dfid, requestedQuality);
            finalUrl = pickKugouPlayableUrl(payload);
        }

        if (!finalUrl && ['flac', 'high'].includes(requestedQuality)) {
            console.warn(`[酷狗] ${getKugouQualityName(requestedQuality)} 未返回可播放链接，回退到 320 MP3`);
            payload = await fetchKugouSongUrlByHash(hash, dfid, '320');
            finalUrl = pickKugouPlayableUrl(payload);
            if (finalUrl) {
              showDynamicIslandToast('当前歌曲高音质不可用，已回退 320 MP3', 2600);
            }
        }

        if (!finalUrl) {
            throw new Error(payload?.error_msg || payload?.msg || '酷狗未返回可播放链接');
        }
        return finalUrl;
    }

    async function searchKugouSong(keyword) {
        if (!kugouToken) throw new Error('请先登录酷狗账号');
        const timestamp = Date.now();
        const url = `${KUGOU_API_BASE}/search?keywords=${encodeURIComponent(keyword)}&page=1&pagesize=1&token=${kugouToken}&timestamp=${timestamp}`;
        const res = await wrappedFetchWithRetry(url, { credentials: 'include' });
        if (!res.ok) throw new Error('搜索失败');
        const data = await res.json();
        if (data.status !== 1 || !data.data.lists.length) throw new Error('未找到歌曲');
        const song = data.data.lists[0];
        return song.FileHash;
    }

    async function getKugouLyricInfo(hash) {
        if (!kugouToken) throw new Error('请先登录酷狗账号');
        const timestamp = Date.now();
        const url = `${KUGOU_API_BASE}/search/lyric?hash=${hash}&token=${kugouToken}&timestamp=${timestamp}`;
        const res = await wrappedFetchWithRetry(url, { credentials: 'include' });
        if (!res.ok) throw new Error('获取歌词信息失败');
        const data = await res.json();
        if (data.status !== 200 || !data.candidates.length) throw new Error('未找到官方歌词');
        const official = data.candidates.find(c => c.product_from === '官方推荐歌词') || data.candidates[0];
        return { id: official.id, accesskey: official.accesskey };
    }

    async function fetchKugouLyricContent(id, accesskey) {
        if (!kugouToken) throw new Error('请先登录酷狗账号');
        const timestamp = Date.now();
        const url = `${KUGOU_API_BASE}/lyric?id=${id}&accesskey=${accesskey}&decode=true&token=${kugouToken}&timestamp=${timestamp}`;
        const res = await wrappedFetchWithRetry(url, { credentials: 'include' });
        if (!res.ok) throw new Error('获取歌词内容失败');
        const data = await res.json();
        if (data.status !== 200 || !data.decodeContent) throw new Error(data.info || '获取失败');
        return data;
    }

    function parseKugouKrc(krcText) {
      if (!krcText || typeof krcText !== 'string') return [];
      const lines = krcText.split('\n').filter(l => l.trim());
      const result = [];

      for (const line of lines) {
        const lineMatch = line.match(/^\[(\d+),(\d+)\]/);
        if (!lineMatch) continue;

        const lineStartMs = parseInt(lineMatch[1], 10);
        const lineDurMs = parseInt(lineMatch[2], 10);
        const rest = line.replace(/^\[\d+,\d+\]/, '');
        const wordRe = /<(\d+),(\d+),\d+>([^<]*)/g;
        const words = [];
        let m;

        while ((m = wordRe.exec(rest)) !== null) {
          const wStartMs = parseInt(m[1], 10);
          const wDurMs = parseInt(m[2], 10);
          // KRC 会把空格写进 token：可能是独立的 " "，也可能是 "Brain " / "Warning? "。
          // 不能 trim，否则中日文 + 英文混排会变成 “合法dopingtime” 或被后续逻辑错误补空格。
          const text = (m[3] || '').replace(/\\n/g, '');
          if (text.length === 0) continue;

          words.push({
            start: (lineStartMs + wStartMs) / 1000,
            end: (lineStartMs + wStartMs + wDurMs) / 1000,
            text
          });
        }

        if (words.length === 0) {
          const plainText = rest.replace(/<[^>]+>/g, '').replace(/\\n/g, '');
          if (plainText.trim()) {
            result.push({
              time: lineStartMs / 1000,
              end: (lineStartMs + lineDurMs) / 1000,
              words: [],
              text: plainText.trim(),
              translation: ''
            });
          }
          continue;
        }

        result.push({
          time: lineStartMs / 1000,
          end: (lineStartMs + lineDurMs) / 1000,
          words,
          text: joinLyricWordsPreservingSpaces(words),
          translation: ''
        });
      }

      return result.sort((a, b) => a.time - b.time);
    }

        async function displayKugouWordLyrics(wordLines) {
      if (!Array.isArray(wordLines) || !wordLines.length) {
        return await renderAMLLLines([], { emptyText: '暂无逐字歌词' });
      }
      const amllLines = legacyWordLinesToAMLLLines(wordLines);
      return await renderAMLLLines(amllLines, {
        source: 'kugou-krc',
        rawLyricText: serializeAMLLLinesToLrc(amllLines, 'main'),
        rawTlyricText: serializeAMLLLinesToLrc(amllLines, 'translated'),
        emptyText: '暂无逐字歌词'
      });
    }

    async function fetchNeteaseTranslation(songName, artistName) {
        console.log(`[翻译] fetchNeteaseTranslation 被调用，歌曲: ${songName}, 歌手: ${artistName}`);
        try {
            const searchUrl = `https://music-api.gdstudio.xyz/api.php?types=search&source=netease&name=${encodeURIComponent(songName + ' ' + artistName)}&count=1&pages=1`;
            console.log(`[翻译] 请求搜索: ${searchUrl}`);
            const res = await wrappedFetch(searchUrl);
            if (!res.ok) throw new Error(`搜索失败 HTTP ${res.status}`);
            const data = await res.json();
            if (!data || data.length === 0) throw new Error('未找到歌曲');
            const song = data[0];
            const lyricId = song.lyric_id;
            console.log(`[翻译] 找到网易云歌曲，lyric_id=${lyricId}`);
            const lyricData = await fetchLyrics(lyricId, 'netease');
            if (!lyricData || !lyricData.tlyric) {
                console.log(`[翻译] 没有翻译歌词`);
                return [];
            }
            const parsed = parseLyrics(lyricData.tlyric);
            console.log(`[翻译] 解析到 ${parsed.length} 行翻译`);
            return parsed;
        } catch (e) {
            console.error(`[翻译] 异常:`, e);
            return [];
        }
    }

    async function fetchKugouWordLyricsWithNeteaseTranslation(songName, artistName, hash = null) {
      console.log(`[酷狗] 开始处理歌曲: ${songName} - ${artistName}`, hash ? `(使用直连 hash: ${hash})` : '(使用搜索模式)');
      try {
        const wordLines = await fetchKugouLyricsOnly(songName, artistName, hash);
        if (!wordLines || wordLines.length === 0) {
          throw new Error('未解析到逐字歌词');
        }
        return wordLines;
      } catch (error) {
        console.error('[酷狗] 逐字歌词获取失败:', error);
        // 抛出错误，让上层处理兜底，不再静默返回 []
        throw new Error(`酷狗歌词失败: ${error?.message || '未知错误'}`);
      }
    }

    function mergeTranslationToWordLines(wordLines, transLines) {
      if (!transLines.length) return wordLines;
      const transTimes = transLines.map(t => t.time);
      const wordTimes = wordLines.map(w => w.time);
      const mapping = alignMonotonicByTime(wordTimes, transTimes, 1.5);
      for (let i = 0; i < wordLines.length; i++) {
        const ti = mapping[i];
        if (ti !== -1 && transLines[ti] && transLines[ti].text) {
          wordLines[i].translation = transLines[ti].text;
        }
      }
      return wordLines;
    }

    const getCaptchaBtn = document.getElementById('kugouGetCaptchaBtn');
    const loginBtn = document.getElementById('kugouLoginBtn');
    const kugouMobileInput = document.getElementById('kugouMobile');
    const kugouCaptchaInput = document.getElementById('kugouCaptcha');
    const KUGOU_CAPTCHA_COOLDOWN_SECONDS = 120;
    const KUGOU_CAPTCHA_COOLDOWN_KEY = 'kugouCaptchaCooldownUntil';
    let kugouCaptchaCountdownTimer = null;

    function clearKugouCaptchaCountdown() {
      if (kugouCaptchaCountdownTimer) {
        clearInterval(kugouCaptchaCountdownTimer);
        kugouCaptchaCountdownTimer = null;
      }
    }

    function resetKugouCaptchaButton() {
      clearKugouCaptchaCountdown();
      localStorage.removeItem(KUGOU_CAPTCHA_COOLDOWN_KEY);
      if (getCaptchaBtn) {
        getCaptchaBtn.disabled = false;
        getCaptchaBtn.textContent = '获取验证码';
      }
    }

    function startKugouCaptchaCooldown(seconds = KUGOU_CAPTCHA_COOLDOWN_SECONDS) {
      if (!getCaptchaBtn) return;

      const endTime = Date.now() + seconds * 1000;
      localStorage.setItem(KUGOU_CAPTCHA_COOLDOWN_KEY, String(endTime));
      clearKugouCaptchaCountdown();

      const updateCountdown = () => {
        const remainingMs = endTime - Date.now();
        const remainingSeconds = Math.ceil(remainingMs / 1000);

        if (remainingSeconds <= 0) {
          resetKugouCaptchaButton();
          return;
        }

        getCaptchaBtn.disabled = true;
        getCaptchaBtn.textContent = `${remainingSeconds}s后可重新获取`;
      };

      updateCountdown();
      kugouCaptchaCountdownTimer = setInterval(updateCountdown, 1000);
    }

    function restoreKugouCaptchaCooldown() {
      const storedEndTime = parseInt(localStorage.getItem(KUGOU_CAPTCHA_COOLDOWN_KEY) || '', 10);
      if (!storedEndTime || Number.isNaN(storedEndTime)) return;

      const remainingSeconds = Math.ceil((storedEndTime - Date.now()) / 1000);
      if (remainingSeconds > 0) {
        startKugouCaptchaCooldown(remainingSeconds);
      } else {
        resetKugouCaptchaButton();
      }
    }

    restoreKugouCaptchaCooldown();

    if (getCaptchaBtn) {
      getCaptchaBtn.addEventListener('click', async () => {
        const mobile = kugouMobileInput.value.trim();
        if (!/^1[3-9]\d{9}$/.test(mobile)) {
          showError('请输入有效手机号', 2000);
          return;
        }

        const storedEndTime = parseInt(localStorage.getItem(KUGOU_CAPTCHA_COOLDOWN_KEY) || '', 10);
        if (storedEndTime && storedEndTime > Date.now()) {
          const remainingSeconds = Math.ceil((storedEndTime - Date.now()) / 1000);
          showError(`请在 ${remainingSeconds}s 后再试`, 2000);
          startKugouCaptchaCooldown(remainingSeconds);
          return;
        }

        try {
          getCaptchaBtn.disabled = true;
          getCaptchaBtn.textContent = '发送中...';
          await sendKugouCaptcha(mobile);
          showError('验证码已发送', 2000);
          startKugouCaptchaCooldown();
        } catch (err) {
          resetKugouCaptchaButton();
          showError(`发送失败: ${err.message}`, 3000);
        }
      });
    }

    if (loginBtn) {
      loginBtn.addEventListener('click', async () => {
        const mobile = kugouMobileInput.value.trim();
        const code = kugouCaptchaInput.value.trim();
        if (!mobile || !code) {
          showError('请填写手机号和验证码', 2000);
          return;
        }
        try {
          loginBtn.disabled = true;
          loginBtn.textContent = '登录中...';
          await loginKugou(mobile, code);
          updateKugouAccountUI?.();
          refreshKugouVipStatus?.({ silent: true });
          scheduleKugouVipAutoRun?.(true);
          showDynamicIslandToast('登陆成功，可开始使用酷狗音乐逐字歌词。', 3000);
        } catch (err) {
          showError(`登录失败: ${err.message}`, 3000);
        } finally {
          loginBtn.disabled = false;
          loginBtn.textContent = '登录';
        }
      });
    }
    async function fetchKugouLyricsOnly(songName, artistName, hash = null) {
        if (!kugouToken) {
            triggerKugouReLogin();
            throw new Error('请先登录酷狗账号');
        }

        let songHash = hash;
        if (!songHash) {
            const keyword = `${songName} ${artistName}`;
            songHash = await searchKugouSong(keyword);
            if (!songHash) throw new Error('未找到歌曲 hash');
        }

        const { id, accesskey } = await getKugouLyricInfo(songHash);
        const fullData = await fetchKugouLyricContent(id, accesskey);
        const decodeContent = fullData.decodeContent;

        const wordLines = parseKugouKrc(decodeContent);
        if (!wordLines.length) throw new Error('未解析到逐字歌词');

        const kugouTranslations = parseKugouTranslationFromDecode(decodeContent);
        if (kugouTranslations.length) {
            const minLen = Math.min(wordLines.length, kugouTranslations.length);
            for (let i = 0; i < minLen; i++) {
                if (kugouTranslations[i] && kugouTranslations[i].trim()) {
                    wordLines[i].translation = kugouTranslations[i].trim();
                }
            }
            console.log(`[酷狗] 已合并 ${minLen} 行内置翻译`);
        } else {
            console.log('[酷狗] 未找到酷狗内置翻译，将仅显示原文');
        }

        return wordLines;
    }
    function setCollapsedTextAnimated(newText, skipAnimation = false, force = false) {
      const collapsedSpan = document.querySelector('.collapsed-text');
      if (!collapsedSpan) return Promise.resolve();

      if (!force && collapsedSpan.dataset.toastActive === 'true') {
        return Promise.resolve();
      }

      if (collapsedSpan.textContent === newText && !skipAnimation) {
        return Promise.resolve();
      }

      collapsedTextAnimationQueue = collapsedTextAnimationQueue.then(() => {
        return new Promise((resolve) => {
          if (currentCollapsedTextAnimationTimer) {
            clearTimeout(currentCollapsedTextAnimationTimer);
            currentCollapsedTextAnimationTimer = null;
          }

          if (skipAnimation) {
            collapsedSpan.textContent = newText;
            refreshDynamicIslandToastLayout();
            resolve();
            return;
          }

          collapsedSpan.classList.add('text-exit');

          setTimeout(() => {
            collapsedSpan.textContent = newText;
            void collapsedSpan.offsetHeight;
            collapsedSpan.classList.remove('text-exit');

            setTimeout(() => {
              refreshDynamicIslandToastLayout();
              resolve();
            }, 180);
          }, 100);
        });
      });

      return collapsedTextAnimationQueue;
    }
    // ==================== 酷狗二维码登录 API ====================
    let kugouQrCheckInterval = null;
    const kugouQrImg = document.getElementById('kugouQrImg');
    const kugouQrPlaceholder = document.getElementById('kugouQrPlaceholder');
    const kugouQrStatus = document.getElementById('kugouQrStatus');
    const kugouRefreshQrBtn = document.getElementById('kugouRefreshQrBtn');
    const kugouQrOverlay = document.getElementById('kugouQrOverlay');

    function stopKugouQrPolling() {
        if (kugouQrCheckInterval) {
            clearInterval(kugouQrCheckInterval);
            kugouQrCheckInterval = null;
        }
    }

    if (kugouRefreshQrBtn) {
        kugouRefreshQrBtn.addEventListener('click', initKugouQrLogin);
    }
    if (kugouQrOverlay) {
        kugouQrOverlay.addEventListener('click', initKugouQrLogin);
    }
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));

            this.classList.add('active');
            const tab = this.dataset.tab;
            document.querySelector(`.settings-tab-content[data-tab="${tab}"]`).classList.add('active');
        });
    });

    const kugouTestTokenBtn = document.getElementById('kugouTestTokenBtn');
    if (kugouTestTokenBtn) {
        kugouTestTokenBtn.addEventListener('click', async () => {
            kugouTestTokenBtn.textContent = '测试中...';
            kugouTestTokenBtn.disabled = true;
            try {
                const hash = await searchKugouSong('周杰伦 晴天');
                await getKugouLyricInfo(hash);
                showDynamicIslandToast('凭证有效！(Token 测试通过)', 2500);
            } catch (err) {
                console.error("Token test failed:", err);
                showError('凭证已过期 (502) 或失效，请重新登录', 4000);
                triggerKugouReLogin(); // 触发退出登录并清理凭证
            } finally {
                kugouTestTokenBtn.textContent = '测试有效性';
                kugouTestTokenBtn.disabled = false;
            }
        });
    }
    const kugouLogoutBtn = document.getElementById('kugouLogoutBtn');
    if (kugouLogoutBtn) {
        kugouLogoutBtn.addEventListener('click', () => {
            triggerKugouReLogin();
            showDynamicIslandToast('已退出酷狗账号', 2000);
        });
    }

    function updateKugouAccountUI() {
        const accInfo = document.getElementById('kugouAccountInfo');
        const avatar = document.getElementById('kugouAvatar');
        const nickLabel = document.getElementById('kugouNicknameLabel');

        const savedToken = localStorage.getItem('kugouToken');
        const savedNick = localStorage.getItem('kugouNickname');
        const savedPic = localStorage.getItem('kugouPic');
        const fallbackPic = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NSIgaGVpZ2h0PSI2NSIgdmlld0JveD0iMCAwIDY1IDY1Ij48cmVjdCB3aWR0aD0iNjUiIGhlaWdodD0iNjUiIGZpbGw9IiNmZmYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiNjY2MiPumAmeaLkTwvdGV4dD48L3N2Zz4=';

        console.log('[updateKugouAccountUI] token:', savedToken ? '***' : 'null', 'nick:', savedNick, 'pic:', savedPic ? '***' : 'null');

        const hasCachedIdentity = savedNick || savedPic;
        if (savedToken || hasCachedIdentity) {
            if(accInfo) accInfo.style.display = 'flex';
            if(nickLabel) nickLabel.textContent = `当前账号：${savedNick || '未知'}`;
            if(avatar) {
                avatar.classList.add('loading');
                avatar.src = savedPic || fallbackPic;
                avatar.onerror = function() {
                    this.classList.remove('loading');
                    this.src = fallbackPic;
                    this.onerror = null;
                };
            }
            if (!savedNick || !savedPic) {
                fetchKugouUserInfo().then(info => {
                    if (!info) return;
                    if (info.nickname && nickLabel) {
                        nickLabel.textContent = `当前账号：${info.nickname}`;
                        localStorage.setItem('kugouNickname', info.nickname);
                    }
                    if (info.pic && avatar) {
                        avatar.classList.add('loading');
                        avatar.src = info.pic;
                        avatar.onerror = function() {
                            this.classList.remove('loading');
                            this.src = fallbackPic;
                            this.onerror = null;
                        };
                        localStorage.setItem('kugouPic', info.pic);
                    }
                }).catch(() => {
                    if (avatar) avatar.classList.remove('loading');
                });
            } else if (avatar && savedPic) {
                avatar.classList.remove('loading');
            }
        } else {
            if(accInfo) accInfo.style.display = 'none';
        }

        if (savedToken) {
            restoreKugouVipStatusFromCache?.('已读取本地 VIP 识别结果，可点击”识别 VIP 身份”同步最新状态。');
        } else if (hasCachedIdentity) {
            setKugouVipStatusUI?.(null, '凭证已失效，请重新登录。');
        } else {
            setKugouVipStatusUI?.(null, '请先登录酷狗账号。');
        }
    }

    function triggerKugouReLogin() {
        localStorage.removeItem('kugouToken');
        localStorage.removeItem('kugouUserId');
        localStorage.removeItem(KUGOU_VIP_LAST_STATUS_KEY);
        kugouToken = '';
        kugouUserId = '';

        showError('酷狗凭证已失效/退出，请重新登录', 4000);
        settingsModalOverlay.classList.add('active');
        document.body.classList.add('settings-modal-open');

        const accountTab = document.querySelector('.settings-tab[data-tab="account"]') || document.querySelector('.nav-item[data-tab="account"]');
        if (accountTab) accountTab.click();

        updateKugouAccountUI();

        const statusEl = document.getElementById('kugouQrStatus');
        const qrImg = document.getElementById('kugouQrImg');
        const placeholder = document.getElementById('kugouQrPlaceholder');
        if(statusEl) statusEl.textContent = '请重新获取二维码';
        if(qrImg) qrImg.style.display = 'none';
        if(placeholder) placeholder.style.display = 'flex';

        clearKugouVipLoopTimer();
    }

    // ==================== 酷狗二维码登录 API ====================
    async function initKugouQrLogin() {
        const statusEl = document.getElementById('kugouQrStatus');
        const qrImg = document.getElementById('kugouQrImg');
        const placeholder = document.getElementById('kugouQrPlaceholder');
        const overlay = document.getElementById('kugouQrOverlay');
        const refreshBtn = document.getElementById('kugouRefreshQrBtn');

        try {
            stopKugouQrPolling();
            if(refreshBtn) refreshBtn.disabled = true;
            if(statusEl) {
                statusEl.textContent = '获取中...';
                statusEl.style.color = 'var(--text-dark)';
            }
            if(overlay) overlay.style.display = 'none';

            const timestamp = Date.now();
            const keyRes = await wrappedFetchWithRetry(`${KUGOU_API_BASE}/login/qr/key?timestamp=${timestamp}`);
            const keyData = await keyRes.json();
            if (!keyData.data || !keyData.data.qrcode) throw new Error('获取失败');
            const qrKey = keyData.data.qrcode;

            const imgRes = await wrappedFetchWithRetry(`${KUGOU_API_BASE}/login/qr/create?key=${qrKey}&qrimg=true&timestamp=${timestamp}`);
            const imgData = await imgRes.json();

            if (qrImg && placeholder) {
                qrImg.src = imgData.data.base64;
                qrImg.style.display = 'block';
                placeholder.style.display = 'none';
            }
            if(statusEl) statusEl.textContent = '请使用酷狗音乐 APP 扫码';

            kugouQrCheckInterval = setInterval(async () => {
                try {
                    const checkRes = await wrappedFetchWithRetry(`${KUGOU_API_BASE}/login/qr/check?key=${qrKey}&timestamp=${Date.now()}`);
                    const checkData = await checkRes.json();

                    const dataObj = checkData.data || {};
                    const actualStatus = dataObj.status !== undefined ? dataObj.status : checkData.status;
                    const statusNum = Number(actualStatus);

                    const token = dataObj.token;
                    const userid = dataObj.userid;
                    const nickname = dataObj.nickname;
                    const pic = dataObj.pic;

                    if (statusNum === 0) {
                        stopKugouQrPolling();
                        if(statusEl) { statusEl.textContent = '已过期'; statusEl.style.color = 'var(--error-color)'; }
                        if(overlay) overlay.style.display = 'flex';
                    } else if (statusNum === 2) {
                        if(statusEl) { statusEl.textContent = '请在手机确认'; statusEl.style.color = 'var(--primary-color)'; }
                    } else if (statusNum === 4 || token) {
                        stopKugouQrPolling();
                        if(statusEl) { statusEl.textContent = '登录成功！'; statusEl.style.color = 'var(--success-color)'; }
                        if(overlay) overlay.style.display = 'none';

                        if (token) {
                            localStorage.setItem('kugouToken', token);
                            kugouToken = token;
                            if (userid) { localStorage.setItem('kugouUserId', userid); kugouUserId = userid; }

                            if (nickname) localStorage.setItem('kugouNickname', nickname);
                            if (pic) localStorage.setItem('kugouPic', pic);
                            markKugouTokenIssued();

                            updateKugouAccountUI();
                            refreshKugouVipStatus?.({ silent: true });
                            scheduleKugouVipAutoRun?.(true);
                            showDynamicIslandToast(`欢迎，${nickname || '用户'}`, 3000);
                        }
                    }
                } catch (err) {
                    console.error("二维码轮询报错:", err);
                }
            }, 2500);

        } catch (e) {
            if(statusEl) { statusEl.textContent = '获取失败'; statusEl.style.color = 'var(--error-color)'; }
            if(overlay) overlay.style.display = 'flex';
        } finally {
            if(refreshBtn) refreshBtn.disabled = false;
        }
    }
    function isSongSwitchLocked() {
      return lyricsRerequestInProgress;
    }

    function guardSongSwitch(targetSongId = null) {
      if (!isSongSwitchLocked()) return false;
      if (targetSongId && currentPlayingId && String(targetSongId) === String(currentPlayingId)) return false;
      showError('正在重新请求歌词，请稍候', 2200);
      return true;
    }

    function buildLyricsRerequestCopy() {
      return [
        '您好，您正在歌词重新请求界面。',
        '请您先阅读以下提示：',
        `1.您当前正在播放的歌曲：${getCurrentPlayingSongName()} ，接下来的重新请求将对该歌曲的歌词进行请求。`,
        '2.重新请求会按 AMLL TTML → 酷狗 KRC → 网易云官方 YRC/LRC 的顺序重新获取并覆盖当前歌词。',
        `3.当前展示模式：${lyricsRendererMode === 'legacy' ? '原先默认展示' : 'AMLL'}。`,
      ].join('\n');
    }

    function updateLyricsRerequestDialog() {
      if (lyricsRerequestCopy) {
        lyricsRerequestCopy.textContent = buildLyricsRerequestCopy();
      }
      const hasSong = !!currentSongData;
      if (lyricsRerequestConfirmBtn) {
        lyricsRerequestConfirmBtn.disabled = !hasSong || lyricsRerequestInProgress;
        lyricsRerequestConfirmBtn.textContent = lyricsRerequestInProgress ? '正在重新请求...' : '点我重新请求';
      }
      if (lyricsRerequestCancelBtn) {
        lyricsRerequestCancelBtn.disabled = lyricsRerequestInProgress;
      }
      if (lyricsRerequestBtn) {
        lyricsRerequestBtn.disabled = lyricsRerequestInProgress;
      }
    }

    function openLyricsRerequestDialog() {
      updateLyricsRerequestDialog();
      lyricsRerequestModalOverlay.classList.add('active');
    }

    function closeLyricsRerequestDialog() {
      if (lyricsRerequestInProgress) return;
      lyricsRerequestModalOverlay.classList.remove('active');
    }

    async function handleLyricsRerequest() {
      if (!currentSongData || !currentPlayingId) {
        showError('当前没有正在播放的歌曲', 2200);
        return;
      }

      lyricsRerequestInProgress = true;
      updateLyricsRerequestDialog();

      try {
        await requestLyricsOnlyForSong(currentSongData);
        closeLyricsRerequestDialog();
        showDynamicIslandToast('歌词重新请求成功', 2500);
      } catch (error) {
        console.error('重新请求歌词失败:', error);
        showError(`歌词重新请求失败: ${error?.message || '未知错误'}`, 3200);
      } finally {
        lyricsRerequestInProgress = false;
        updateLyricsRerequestDialog();
      }
    }
    function parseKugouTranslationFromDecode(decodeContent) {
        if (!decodeContent || typeof decodeContent !== 'string') return [];

        const langMatch = decodeContent.match(/\[language:([A-Za-z0-9+/=]+)\]/);
        if (!langMatch) return [];

        try {
            const base64Str = langMatch[1];
            const decoded = atob(base64Str);
            const langData = JSON.parse(decoded);

            if (langData.content && Array.isArray(langData.content)) {
                for (const item of langData.content) {
                    if (item.language === 0 && item.type === 1 && Array.isArray(item.lyricContent)) {
                        const translations = [];
                        for (const lyricPart of item.lyricContent) {
                            let transText = '';
                            if (Array.isArray(lyricPart) && lyricPart.length > 0) {
                                transText = lyricPart.find(t => t && t.trim()) || '';
                            } else if (typeof lyricPart === 'string') {
                                transText = lyricPart;
                            }
                            translations.push(transText);
                        }
                        return translations;
                    }
                }
            }
        } catch (e) {
            console.warn('解析酷狗翻译失败:', e);
        }
        return [];
    }
    async function claimKugouYouthVipOnce({ onProgress } = {}) {
      return withKugouRequestDedup('kugou-vip-claim-once', async () => {
        const res = await wrappedFetch(buildKugouApiUrl('/youth/vip', {}, true, false), { credentials: 'include' });
        if (!res.ok) throw new Error('领取 VIP 请求失败');
        const payload = await res.json();
        if (payload.status !== 1) throw new Error(payload.error_msg || payload.msg || '领取 VIP 失败');
        const data = payload.data || {};
        const remain = Number(data.remain) ?? -1;
        const done = Number(data.done) ?? 0;
        const total = Number(data.total) ?? 8;
        const award = Number(data.award_vip_hour) ?? 3;
        onProgress?.(`本次领取 +${award} 小时 (${done}/${total})，剩余 ${remain} 次可领。`);
        return { payload, remain, done, total };
      });
    }
    function ensureWordSpacingForForeignLyrics(lines) {
      if (!Array.isArray(lines)) return lines;

      // 检测拉丁字母（基础拉丁范围，含扩展可酌情添加）
      const latinRegex = /[a-zA-Z\u00C0-\u00FF]/; // 基础拉丁字母 + 带重音字母
      const cjkRegex = /[\u4e00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/; // 中日韩字符

      for (const line of lines) {
        // TTML 已经根据 <span> 之间是否存在真实空白处理过单词边界，不能再二次拆分/补空格。
        if (line._fromTtml) continue;

        // 只处理只有一个 word 的行（非逐字歌词降级后的形态）
        if (!line.words || line.words.length !== 1) continue;

        const wordObj = line.words[0];
        const rawText = wordObj.word;
        if (!rawText || rawText.trim().length === 0) continue;

        const hasLatin = latinRegex.test(rawText);
        const hasCJK = cjkRegex.test(rawText);

        // 包含 CJK 字符 -> 保持原样（中文等不需要添加间隔）
        if (hasCJK) continue;
        // 不包含拉丁字母（纯标点/数字等）也不处理
        if (!hasLatin) continue;

        // 普通 LRC 没有逐字时间轴时，按词拆分并把整句时长按字符权重分配给各词。
        // 旧逻辑让所有词共享整句 start/end，英文再拆字母后就会表现为整句快结束时第一个词才刚开始推进。
        const parts = rawText.match(/\S+\s*/g) || [];
        if (parts.length <= 1) continue;

        const startTime = Number(wordObj.startTime);
        const endTime = Number(wordObj.endTime);
        if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) continue;

        const totalDuration = endTime - startTime;
        const weights = parts.map(part => {
          const visible = part.trim().replace(/[\s.,!?;:'"()\[\]{}<>，。！？；：“”‘’（）【】《》、]/g, '');
          return Math.max(1, visible.length || part.trim().length || 1);
        });
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || parts.length;
        const newWords = [];
        let cursor = startTime;

        parts.forEach((part, index) => {
          const nextTime = index === parts.length - 1
            ? endTime
            : Math.min(endTime, cursor + (totalDuration * weights[index] / totalWeight));
          newWords.push({
            startTime: Math.round(cursor),
            endTime: Math.max(Math.round(cursor) + 1, Math.round(nextTime)),
            word: part
          });
          cursor = nextTime;
        });

        // 替换原有 word 列表
        line.words = newWords;
      }

      return lines;
    }

    // ====================================================================
    // 模块 1: Gapless Playback 无缝播放 + Crossfade
    // ====================================================================
    async function preloadNextSongForGapless(nextSong) {
      if (!nextSong || !nextSong.id) return;
      try {
        if (gaplessPreloadAbort) { gaplessPreloadAbort.abort(); }
        gaplessPreloadAbort = new AbortController();
        const audioUrl = await getAudioUrl(nextSong.id, nextSong.source, nextSong);
        if (gaplessPreloadAbort.signal.aborted) return;
        gaplessPreloadUrl = audioUrl;
        audioPlayerB.crossOrigin = 'anonymous';
        audioPlayerB.src = audioUrl;
        audioPlayerB.preload = 'auto';
        audioPlayerB.volume = 0;
        audioPlayerB.load();
        console.log('[Gapless] 已预加载下一首:', nextSong.name);
      } catch (e) {
        console.warn('[Gapless] 预加载失败:', e?.message || e);
        gaplessPreloadUrl = null;
      }
    }

    function performCrossfadeToNext() {
      if (!gaplessPreloadUrl || !audioPlayerB.src || audioPlayerB.src === window.location.href) return false;
      isCrossfading = true;
      const startVolA = audioPlayer.volume;
      const targetVol = volumeSlider ? parseFloat(volumeSlider.value) : 0.7;
      const steps = 30;
      const interval = (CROSSFADE_DURATION * 1000) / steps;
      let step = 0;
      audioPlayerB.volume = 0;
      audioPlayerB.currentTime = 0;
      audioPlayerB.play().catch(() => {});
      const fadeInterval = setInterval(() => {
        step++;
        const ratio = step / steps;
        audioPlayer.volume = Math.max(0, startVolA * (1 - ratio));
        audioPlayerB.volume = Math.min(targetVol * ratio, targetVol);
        if (step >= steps) {
          clearInterval(fadeInterval);
          audioPlayer.pause();
          audioPlayer.src = audioPlayerB.src;
          audioPlayer.currentTime = audioPlayerB.currentTime;
          audioPlayer.volume = targetVol;
          audioPlayer.play().catch(() => {});
          audioPlayerB.src = '';
          audioPlayerB.volume = 0;
          gaplessPreloadUrl = null;
          isCrossfading = false;
        }
      }, interval);
      return true;
    }

    // 歌曲即将结束时触发 crossfade
    (function patchAudioForGapless() {
      let crossfadeTriggered = false;
      audioPlayer.addEventListener('timeupdate', function onGaplessTimeUpdate() {
        if (isCrossfading) return;
        const duration = audioPlayer.duration || 0;
        const currentTime = audioPlayer.currentTime || 0;
        if (duration <= 0 || isNaN(duration)) return;
        if (currentPlayMode === 'repeat') {
          crossfadeTriggered = false;
          return;
        }
        const remaining = duration - currentTime;
        if (remaining <= CROSSFADE_DURATION && remaining > 0 && !crossfadeTriggered) {
          crossfadeTriggered = true;
          const nextSongId = getNextSongId(currentPlayingId);
          if (!nextSongId) return;
          const nextSong = getSongById(nextSongId);
          if (!nextSong) return;
          if (gaplessPreloadUrl && audioPlayerB.src && audioPlayerB.readyState >= 2) {
            try {
              requestLyricsOnlyForSong(nextSong).catch(() => {});
              nowPlayingTitle.textContent = nextSong.name || '未知歌曲';
              const sn = getMusicSourceName(nextSong?.source);
              const at = toArtistText(nextSong.artist);
              if (nowPlayingArtist) nowPlayingArtist.textContent = sn + ' · ' + at;
              currentSongInfo = { name: nextSong.name || '未知歌曲', artist: sn + ' · ' + at, album: nextSong.album || '' };
              currentSongData = nextSong;
              currentPlayingId = nextSong.id;
              currentPlaylistIdx = getPlaylistIndexById(nextSong.id);
              updateDynamicIslandWelcome();
              updateLyricsRerequestDialog();
              sendCurrentSongToDesktop();
              loadAlbumArt(nextSong.pic_id, nextSong.source).catch(() => {});
              addToHistory(nextSong);
              if (performCrossfadeToNext()) {
                if (currentTab === 'playlist') renderPlaylist();
                updatePageTitle();
              }
            } catch (e) { console.warn('[Gapless] crossfade 失败:', e?.message || e); }
          }
        }
        if (currentPlayingId && currentTime < 1) crossfadeTriggered = false;
      });
      audioPlayer.addEventListener('ended', async function onGaplessEnded() {
        if (isCrossfading) return;
        if (currentPlayMode === 'repeat') return;
        const nid = getNextSongId(currentPlayingId);
        if (!nid) return;
        const ns = getSongById(nid);
        if (!ns) return;
        try { await playSong(ns, true); } catch (e) { console.warn('[Gapless] fallback:', e?.message || e); }
      });
    })();

    // 包装 playSong 以支持预加载
    const _origPlaySong = playSong;
    playSong = async function(song, isFromPlaylist) {
      if (isCrossfading) { audioPlayerB.pause(); audioPlayerB.src = ''; gaplessPreloadUrl = null; isCrossfading = false; }
      const result = await _origPlaySong(song, isFromPlaylist);
      if (currentPlayMode !== 'repeat' && (isFromPlaylist || currentActivePlaylist.length > 0)) {
        const nid = getNextSongId(song.id);
        if (nid) { const ns = getSongById(nid); if (ns) preloadNextSongForGapless(ns); }
      }
      return result;
    };

    // ====================================================================
    // ====================================================================
    // 模块 2: IndexedDB 本地歌词缓存
    // ====================================================================
    const LYRICS_CACHE_DB = 'HarmoniaLyricsCache';
    const LYRICS_CACHE_VER = 1;
    const LYRICS_CACHE_STORE = 'lyrics';
    function openLyricsDB() {
      if (openLyricsDB._cached && !openLyricsDB._cached._closed) {
        return Promise.resolve(openLyricsDB._cached);
      }
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(LYRICS_CACHE_DB, LYRICS_CACHE_VER);
        req.onupgradeneeded = e => { const db = e.target.result; if (!db.objectStoreNames.contains(LYRICS_CACHE_STORE)) db.createObjectStore(LYRICS_CACHE_STORE, { keyPath: 'cacheKey' }); };
        req.onsuccess = e => { openLyricsDB._cached = e.target.result; resolve(e.target.result); };
        req.onerror = e => reject(e.target.error);
      });
    }
    function lyricsCacheKey(songId, source, type) { return normalizeMusicSource(source) + ':' + songId + ':' + type; }
    async function getCachedLyrics(songId, source, type) {
      try { const db = await openLyricsDB(); const ck = lyricsCacheKey(songId, source, type); return new Promise((resolve, reject) => { const tx = db.transaction(LYRICS_CACHE_STORE, 'readonly'); const req = tx.objectStore(LYRICS_CACHE_STORE).get(ck); req.onsuccess = () => resolve(req.result ? req.result.data : null); req.onerror = () => reject(req.error); }); } catch (e) { return null; }
    }
    async function setCachedLyrics(songId, source, type, data) {
      try { const db = await openLyricsDB(); const ck = lyricsCacheKey(songId, source, type); return new Promise((resolve, reject) => { const tx = db.transaction(LYRICS_CACHE_STORE, 'readwrite'); tx.objectStore(LYRICS_CACHE_STORE).put({ cacheKey: ck, data, timestamp: Date.now() }); tx.oncomplete = () => { resolve(); }; tx.onerror = () => reject(tx.error); }); } catch (e) {}
    }
    const _origFetchLyrics = fetchLyrics;
    fetchLyrics = async function(lyricId, source) {
      const sid = lyricId || (currentSongData?.id); const src = source || currentSongData?.source || 'netease';
      if (sid) { const c = await getCachedLyrics(sid, src, 'lyric'); if (c) return c; }
      const r = await _origFetchLyrics(lyricId, source);
      if (r && sid) await setCachedLyrics(sid, src, 'lyric', r);
      return r;
    };
    if (typeof fetchNeteaseLyricAll === 'function') {
      const _origFetchNeteaseLyricAll = fetchNeteaseLyricAll;
      fetchNeteaseLyricAll = async function(songId) {
        if (songId) { const c = await getCachedLyrics(songId, 'netease', 'yrc'); if (c) return c; }
        const r = await _origFetchNeteaseLyricAll(songId);
        if (r && songId) await setCachedLyrics(songId, 'netease', 'yrc', r);
        return r;
      };
    }

    // ====================================================================
    // 模块 4: 分享卡片生成
    // ====================================================================
    function generateShareCard() {
      const canvas = posterCanvas; if (!canvas) return;
      const ctx = canvas.getContext('2d'); const W = 1080, H = 1920;
      ctx.clearRect(0, 0, W, H);
      /* 深色中性背景，避免紫色调 */
      const bgG = ctx.createLinearGradient(0, 0, 0, H);
      bgG.addColorStop(0, '#141418');
      bgG.addColorStop(0.3, '#0e0e12');
      bgG.addColorStop(0.7, '#0e0e12');
      bgG.addColorStop(1, '#141418');
      ctx.fillStyle = bgG; ctx.fillRect(0, 0, W, H);

      /* 提取专辑主色用于光晕 */
      let accentA = '#ff2d55', accentB = '#ff6b8a';
      try {
        if (albumArt && albumArt.src && !albumArt.src.includes('data:image/gif')) {
          const tmp = document.createElement('canvas'); tmp.width = 64; tmp.height = 64;
          const tc = tmp.getContext('2d'); tc.drawImage(albumArt, 0, 0, 64, 64);
          const px = tc.getImageData(32, 32, 1, 1).data;
          if (px[3] > 0) {
            accentA = `rgb(${px[0]},${px[1]},${px[2]})`;
            accentB = `rgb(${Math.min(255,px[0]+60)},${Math.min(255,px[1]+40)},${Math.min(255,px[2]+80)})`;
          }
        }
      } catch (_) {}

      ctx.globalAlpha = 0.12;
      const g1 = ctx.createRadialGradient(W*0.72, H*0.22, 40, W*0.72, H*0.22, 520);
      g1.addColorStop(0, accentA); g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
      const g2 = ctx.createRadialGradient(W*0.28, H*0.72, 40, W*0.28, H*0.72, 520);
      g2.addColorStop(0, accentB); g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;

      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = 'bold 54px "SFPro-Semibold","PingFangSC-Semibold",-apple-system,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Harmonia', 100, 108);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '24px "SFPro-Regular","PingFangSC-Regular",-apple-system,sans-serif';
      ctx.fillText('音乐播放器', 100, 148);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(100, 170); ctx.lineTo(W - 100, 170); ctx.stroke();

      const covS = 520, covX = (W - covS) / 2, covY = 260, covR = 44;
      ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 70; ctx.shadowOffsetY = 24;
      ctx.beginPath();
      ctx.moveTo(covX+covR, covY); ctx.lineTo(covX+covS-covR, covY);
      ctx.arcTo(covX+covS, covY, covX+covS, covY+covR, covR);
      ctx.lineTo(covX+covS, covY+covS-covR); ctx.arcTo(covX+covS, covY+covS, covX+covS-covR, covY+covS, covR);
      ctx.lineTo(covX+covR, covY+covS); ctx.arcTo(covX, covY+covS, covX, covY+covS-covR, covR);
      ctx.lineTo(covX, covY+covR); ctx.arcTo(covX, covY, covX+covR, covY, covR);
      ctx.closePath(); ctx.save(); ctx.clip();
      let covOk = false;
      if (albumArt && albumArt.src && !albumArt.src.includes('data:image/gif')) {
        try {
          const img = new Image(); img.crossOrigin = 'anonymous'; img.src = albumArt.src;
          if (img.complete && img.naturalWidth > 0) { ctx.drawImage(img, covX, covY, covS, covS); covOk = true; }
        } catch (_) {}
      }
      if (!covOk) {
        const pg = ctx.createLinearGradient(covX, covY, covX+covS, covY+covS);
        pg.addColorStop(0, accentA); pg.addColorStop(1, accentB);
        ctx.fillStyle = pg; ctx.fillRect(covX, covY, covS, covS);
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '110px "Font Awesome 6 Free"';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('\uf001', covX+covS/2, covY+covS/2);
      }
      ctx.restore(); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(covX+covR, covY); ctx.lineTo(covX+covS-covR, covY);
      ctx.arcTo(covX+covS, covY, covX+covS, covY+covR, covR);
      ctx.lineTo(covX+covS, covY+covS-covR); ctx.arcTo(covX+covS, covY+covS, covX+covS-covR, covY+covS, covR);
      ctx.lineTo(covX+covR, covY+covS); ctx.arcTo(covX, covY+covS, covX, covY+covS-covR, covR);
      ctx.lineTo(covX, covY+covR); ctx.arcTo(covX, covY, covX+covR, covY, covR);
      ctx.closePath(); ctx.stroke();

      const sn = currentSongInfo?.name || '未知歌曲';
      const an = (currentSongInfo?.artist || '未知歌手').replace(/^[^·]*·\s*/, '');
      const infoY = covY + covS + 56;
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.font = 'bold 46px "SFPro-Semibold","PingFangSC-Semibold",-apple-system,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(sn.length > 16 ? sn.substring(0, 15) + '…' : sn, W/2, infoY);
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '28px "SFPro-Regular","PingFangSC-Regular",-apple-system,sans-serif';
      ctx.fillText(an, W/2, infoY + 56);

      const shareY = infoY + 120;
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '30px "SFPro-Regular","PingFangSC-Regular",-apple-system,sans-serif';
      ctx.fillText('我在 Harmonia 发现一首好歌！', W/2, shareY);
      ctx.fillText('快来跟我一起听 🎵', W/2, shareY + 46);

      const sepY = shareY + 100;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(140, sepY); ctx.lineTo(W-140, sepY); ctx.stroke();
      const now = new Date();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '22px "SFPro-Regular","PingFangSC-Regular",-apple-system,sans-serif';
      ctx.fillText('分享时间：' + now.toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'}) + ' ' + now.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}), W/2, sepY + 52);

      const footerY = H - 140;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(140, footerY); ctx.lineTo(W-140, footerY); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.font = '20px "SFPro-Regular","PingFangSC-Regular",-apple-system,sans-serif';
      ctx.fillText('Harmonia Music Player', W/2, footerY + 44);
      ctx.fillStyle = accentA; ctx.beginPath(); ctx.arc(W/2-80, footerY+40, 3.5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = accentB; ctx.beginPath(); ctx.arc(W/2+80, footerY+40, 3.5, 0, Math.PI*2); ctx.fill();
    }
    function openPosterModal() { if (!posterModalOverlay) return; generateShareCard(); posterModalOverlay.classList.add('active'); }
    function closePosterModal() { if (posterModalOverlay) posterModalOverlay.classList.remove('active'); }
    function downloadPoster() { const c = posterCanvas; if (!c) return; const a = document.createElement('a'); a.download = 'Harmonia_' + (currentSongInfo?.name || 'share').replace(/[\\/:*?"<>|]/g, '_') + '_' + Date.now() + '.png'; a.href = c.toDataURL('image/png'); a.click(); showDynamicIslandToast('分享卡片已下载', 2000); }
    async function copyPoster() { const c = posterCanvas; if (!c) return; try { const b = await new Promise(r => c.toBlob(r, 'image/png')); if (!b) throw new Error('生成失败'); await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); showDynamicIslandToast('分享卡片已复制到剪贴板', 2000); } catch (e) { showError('复制失败，请尝试下载', 2500); } }
    if (shareBtn) shareBtn.addEventListener('click', openPosterModal);
    if (posterModalClose) posterModalClose.addEventListener('click', closePosterModal);
    if (posterModalOverlay) posterModalOverlay.addEventListener('click', e => { if (e.target === posterModalOverlay) closePosterModal(); });
    if (posterDownloadBtn) posterDownloadBtn.addEventListener('click', downloadPoster);
    if (posterCopyBtn) posterCopyBtn.addEventListener('click', copyPoster);

    // PiP 全局辅助函数
    window.pipGetPlaylist = function() { return JSON.parse(JSON.stringify(playlist)); };
    window.pipGetCurrentPlayingId = function() { return currentPlayingId; };
    window.pipGetPlayMode = function() { return currentPlayMode; };
    window.pipCyclePlayMode = function() { if (playModeBtn) playModeBtn.click(); };
    window.pipRemoveFromPlaylist = function(index) { removeFromPlaylist(index); };
    window.pipPlayFromPlaylist = function(index) { playFromPlaylist(index); };
    window.pipIsPlaying = function() { return isPlaying; };
    window.pipGetCurrentSongInfo = function() { return currentSongInfo ? { name: currentSongInfo.name, artist: currentSongInfo.artist } : null; };

    // ====================================================================
    // 模块 4.5: Mini 播放器 (Picture-in-Picture)
    // ====================================================================
    const PIP_SUPPORTED = typeof documentPictureInPicture !== 'undefined';

    function buildPipContent() {
      const songName = currentSongInfo?.name || 'Harmonia';
      const rawArtist = (currentSongInfo?.artist || '').replace(/^[^·]*·\s*/, '');
      const isPlayingNow = isPlaying;

      return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title></title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:-apple-system,'Segoe UI','Microsoft YaHei',sans-serif;background:#0a0a0a;color:#fff;height:100vh;overflow:hidden;user-select:none;-webkit-user-select:none;}
.pip-wrapper{display:flex;flex-direction:column;height:100vh;position:relative;}
/* ===== 专辑图区域 ===== */
.pip-artwork{position:relative;flex:1;overflow:hidden;min-height:0;background:#111;display:flex;flex-direction:column;}
.pip-artwork-stage{position:relative;flex:1;overflow:hidden;min-height:0;}
.pip-artwork-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.pip-artwork-placeholder{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:72px;color:rgba(255,255,255,0.08);}
.pip-artwork-progress-ring{position:absolute;inset:10px;z-index:3;border-radius:22px;padding:4px;pointer-events:none;--pip-progress:0deg;background:conic-gradient(from -90deg,#1DB954 var(--pip-progress),rgba(255,255,255,0.18) 0);filter:drop-shadow(0 0 10px rgba(29,185,84,0.35));transition:background 0.12s linear;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;}
.pip-artwork-progress-ring::after{content:'';position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.12);}
/* 专辑图底部控制按钮 */
.pip-artwork-controls{position:absolute;bottom:0;left:0;right:0;z-index:4;display:flex;justify-content:center;align-items:center;gap:20px;padding:20px 16px;background:linear-gradient(transparent,rgba(0,0,0,0.7));}
.pip-ctrl-btn{width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.1);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;transition:all 0.15s;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}
.pip-ctrl-btn:hover{background:rgba(255,255,255,0.25);transform:scale(1.06);}
.pip-ctrl-play{width:52px;height:52px;font-size:22px;background:#1DB954;border-color:#1DB954;}
.pip-ctrl-play:hover{background:#1ed760;border-color:#1ed760;}
/* ===== 底部信息栏 ===== */
.pip-info-bar{display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(0,0,0,0.5);border-top:1px solid rgba(255,255,255,0.04);flex-shrink:0;}
.pip-info-text{flex:1;min-width:0;overflow:hidden;}
.pip-info-title{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff;}
.pip-info-artist{font-size:11px;color:rgba(255,255,255,0.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;}
.pip-info-actions{display:flex;align-items:center;gap:6px;flex-shrink:0;}
.pip-info-btn{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.08);border:none;color:rgba(255,255,255,0.55);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;transition:all 0.15s;}
.pip-info-btn:hover{background:rgba(255,255,255,0.15);color:#fff;}
.pip-info-btn.active{background:rgba(29,185,84,0.15);color:#1DB954;}
.pip-mode-btn{position:relative;font-size:14px;}
/* ===== 播放列表面板 ===== */
.pip-playlist-panel{position:absolute;top:0;right:-100%;width:100%;height:100%;background:#0f0f0f;z-index:10;transition:right 0.3s cubic-bezier(0.4,0,0.2,1);display:flex;flex-direction:column;}
.pip-playlist-panel.open{right:0;}
.pip-playlist-header{display:flex;gap:6px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.04);flex-shrink:0;}
.pip-playlist-search{flex:1;padding:7px 10px;border-radius:6px;border:none;background:rgba(255,255,255,0.06);color:#fff;font-size:12px;outline:none;}
.pip-playlist-search::placeholder{color:rgba(255,255,255,0.25);}
.pip-playlist-search:focus{background:rgba(255,255,255,0.1);}
.pip-playlist-close-btn{padding:6px 10px;border-radius:6px;border:none;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.5);cursor:pointer;font-size:11px;transition:all 0.15s;}
.pip-playlist-close-btn:hover{background:rgba(255,255,255,0.12);color:#fff;}
.pip-playlist-list{flex:1;overflow-y:auto;padding:4px 0;}
.pip-playlist-item{display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;transition:background 0.1s;border-left:3px solid transparent;}
.pip-playlist-item:hover{background:rgba(255,255,255,0.04);}
.pip-playlist-item.playing{background:rgba(29,185,84,0.06);border-left-color:#1DB954;}
.pip-playlist-item .pip-pl-num{width:20px;text-align:center;font-size:11px;color:rgba(255,255,255,0.25);flex-shrink:0;}
.pip-playlist-item.playing .pip-pl-num{color:#1DB954;}
.pip-playlist-item .pip-pl-info{flex:1;min-width:0;}
.pip-playlist-item .pip-pl-name{font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:rgba(255,255,255,0.85);}
.pip-playlist-item.playing .pip-pl-name{color:#1DB954;}
.pip-playlist-item .pip-pl-artist{font-size:10px;color:rgba(255,255,255,0.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pip-playlist-item .pip-pl-remove{width:24px;height:24px;border:none;background:none;color:rgba(255,255,255,0.2);cursor:pointer;font-size:14px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s;}
.pip-playlist-item .pip-pl-remove:hover{color:#ff4d4d;background:rgba(255,77,77,0.1);}
.pip-playlist-empty{padding:30px 0;text-align:center;color:rgba(255,255,255,0.2);font-size:12px;}

/* ===== 播放器控件（按截图重写） ===== */

/* 歌曲信息区 */
.player-song-info{
text-align:left !important;
margin:6px 0 14px !important;
width:420px !important;
max-width:420px !important;
}
.player-song-info .now-playing-title{
font-size:17px !important;
font-weight:700 !important;
color:rgba(255,255,255,0.88) !important;
white-space:nowrap !important;
overflow:hidden !important;
text-overflow:ellipsis !important;
max-width:420px !important;
text-align:left !important;
-webkit-user-select:text !important;
user-select:text !important;
margin:0 !important;
}
.player-song-info .now-playing-artist{
font-size:13px !important;
font-weight:500 !important;
color:rgba(255,255,255,0.45) !important;
white-space:nowrap !important;
overflow:hidden !important;
text-overflow:ellipsis !important;
max-width:420px !important;
text-align:left !important;
margin-top:2px !important;
-webkit-user-select:text !important;
user-select:text !important;
display:block !important;
}

/* 进度条区域 */
.progress-section{
width:420px !important;
margin:0 auto !important;
}
.progress-container{
width:100% !important;
margin-bottom:2px !important;
position:relative !important;
}
.progress-bar{
width:100% !important;
height:4px !important;
background:rgba(255,255,255,0.2) !important;
border-radius:10px !important;
overflow:visible !important;
cursor:pointer !important;
}
.progress-container:hover .progress-bar{height:6px !important;}
.progress-meta{
display:flex !important;
align-items:center !important;
justify-content:space-between !important;
width:100% !important;
margin-top:6px !important;
}
.progress-meta .time-current,
.progress-meta .time-duration{
color:rgba(255,255,255,0.4) !important;
font-size:11px !important;
font-weight:500 !important;
letter-spacing:0.2px !important;
}

/* 音质标识 */
.quality-badge{
font-size:10px !important;
font-weight:600 !important;
color:rgba(255,255,255,0.4) !important;
text-align:center !important;
margin-top:8px !important;
letter-spacing:0.3px !important;
cursor:default !important;
user-select:none !important;
background:rgba(255,255,255,0.06) !important;
display:block !important;
padding:2px 8px !important;
border-radius:10px !important;
border:1px solid rgba(255,255,255,0.08) !important;
width:fit-content !important;
margin-left:auto !important;
margin-right:auto !important;
}

/* 播放控制按钮 */
.controls{
display:flex !important;
justify-content:center !important;
align-items:center !important;
gap:20px !important;
margin:16px auto 0 !important;
width:100% !important;
}
.control-button{
background:rgba(255,255,255,0.095) !important;
backdrop-filter:blur(32px) saturate(190%) !important;
-webkit-backdrop-filter:blur(32px) saturate(190%) !important;
border:1px solid rgba(255,255,255,0.18) !important;
color:var(--text-dark) !important;
font-size:24px !important;
cursor:pointer !important;
width:50px !important;
height:50px !important;
display:flex !important;
align-items:center !important;
justify-content:center !important;
border-radius:var(--border-radius-full) !important;
transition:var(--transition-liquid) !important;
box-shadow:0 12px 35px rgba(0,0,0,0.45),var(--glass-inner-glow) !important;
}
.control-button:hover{
background:rgba(255,255,255,0.10) !important;
transform:scale(1.06) !important;
box-shadow:0 18px 45px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.45) !important;
}
.play-button{
width:70px !important;
height:70px !important;
font-size:30px !important;
border-radius:var(--border-radius-full) !important;
box-shadow:0 6px 20px rgba(255,45,85,0.4) !important;
background:linear-gradient(135deg,rgba(255,45,85,0.8),rgba(255,55,95,0.7)) !important;
color:#fff !important;
}
.play-button:hover{
background:linear-gradient(135deg,#ff375f,#ff2d55) !important;
transform:scale(1.08) !important;
}
.play-mode-btn{
background:rgba(255,255,255,0.095) !important;
backdrop-filter:blur(32px) saturate(190%) !important;
-webkit-backdrop-filter:blur(32px) saturate(190%) !important;
border:1px solid rgba(255,255,255,0.18) !important;
color:var(--text-muted-dark) !important;
font-size:20px !important;
cursor:pointer !important;
width:50px !important;
height:50px !important;
display:flex !important;
align-items:center !important;
justify-content:center !important;
border-radius:var(--border-radius-full) !important;
transition:var(--transition-liquid) !important;
box-shadow:0 12px 35px rgba(0,0,0,0.45),var(--glass-inner-glow) !important;
}
.play-mode-btn:hover{
background:rgba(255,255,255,0.15) !important;
color:var(--primary-color) !important;
transform:scale(1.06) !important;
}
.shuffle-btn{
width:40px !important;
height:40px !important;
font-size:16px !important;
}
.share-btn{
width:40px !important;
height:40px !important;
font-size:16px !important;
}

/* 旧音量条样式（保留兼容） */
.volume-bar{
display:flex !important;
align-items:center !important;
gap:8px !important;
margin:10px auto 0 !important;
width:420px !important;
}
.volume-bar i{
color:rgba(255,255,255,0.4) !important;
font-size:12px !important;
}
.volume-bar .volume-slider{
flex:1 !important;
-webkit-appearance:none !important;
height:4px !important;
background:rgba(255,255,255,0.18) !important;
border-radius:999px !important;
outline:none !important;
cursor:pointer !important;
}
.volume-bar .volume-slider::-webkit-slider-thumb{
-webkit-appearance:none !important;
appearance:none !important;
width:14px !important;
height:14px !important;
border-radius:50% !important;
background:rgba(255,255,255,0.9) !important;
cursor:grab !important;
box-shadow:0 4px 12px rgba(0,0,0,0.4) !important;
transition:all 0.2s !important;
}

/* 专辑图三点按钮（新位置） */
.album-art-container{
position:relative !important;
}
.album-art-dots{
position:absolute !important;
right:10px !important;
top:10px !important;
width:28px !important;
height:28px !important;
border-radius:50% !important;
background:rgba(0,0,0,0.3) !important;
backdrop-filter:blur(8px) !important;
-webkit-backdrop-filter:blur(8px) !important;
border:1px solid rgba(255,255,255,0.12) !important;
color:rgba(255,255,255,0.8) !important;
cursor:pointer !important;
display:flex !important;
align-items:center !important;
justify-content:center !important;
font-size:12px !important;
transition:all 0.2s ease !important;
z-index:5 !important;
}
.album-art-dots:hover{
background:rgba(0,0,0,0.5) !important;
color:#fff !important;
transform:scale(1.1) !important;
}

/* === 以下从 backup_backup 移植 === */
.player-info{
text-align:center;
width:100%;
margin-top:25px;
}
.time-display{
display:flex;
align-items:center;
justify-content:space-between;
width:425px;
margin:0 auto;
color:#fff;
text-shadow:0 0 3px rgba(0,0,0,0.6);
font-size:14px;
margin-bottom:10px;
}
.player-meta{
flex:1;
min-width:0;
display:flex;
flex-direction:column;
align-items:center;
justify-content:center;
gap:4px;
}
.volume-container{
display:flex;
align-items:center;
gap:10px;
background:transparent;
backdrop-filter:none;
-webkit-backdrop-filter:none;
border:1px solid transparent;
padding:8px 15px;
border-radius:30px;
}
.volume-container .volume-slider{
width:100px;
height:5px;
background:rgba(255,255,255,0.18);
border-radius:999px;
}
.volume-container .volume-slider::-webkit-slider-thumb{
-webkit-appearance:none;
appearance:none;
width:18px;
height:18px;
border-radius:var(--border-radius-full);
background:rgba(255,255,255,0.95);
cursor:grab;
box-shadow:0 8px 20px rgba(0,0,0,0.45),0 0 0 6px rgba(255,45,85,0.12);
transition:all 0.2s;
}
.volume-container i{
color:var(--text-muted-dark);
}
body.light-theme .volume-container i{
color:rgba(0,0,0,0.6);
}
body.player-layout-apple-music .player-info{
width:425px;
text-align:left;
}
body.player-layout-apple-music .time-display{
width:425px;
margin:0 auto 12px;
display:grid;
grid-template-columns:auto 1fr auto;
grid-template-areas:"meta meta meta" "current . duration";
row-gap:10px;
align-items:end;
font-size:12px;
color:rgba(255,255,255,0.68);
}
body.player-layout-apple-music .player-meta{
grid-area:meta;
align-items:flex-start;
gap:6px;
}
body.player-layout-apple-music #currentTime{grid-area:current}
body.player-layout-apple-music #duration{grid-area:duration}
body.light-theme.player-layout-apple-music .time-display{color:rgba(0,0,0,0.58)}
body.player-layout-apple-music .volume-container{
justify-content:flex-end;
padding:0;
background:none;
border:none;
box-shadow:none;
gap:8px;
min-width:108px;
order:5;
}
body.player-layout-apple-music .volume-container i{color:rgba(255,255,255,0.62) !important}
body.light-theme.player-layout-apple-music .volume-container i{color:rgba(0,0,0,0.52) !important}
@media (max-width:768px){
.player-info,
.leftcontent>div{
width:100%;
max-width:320px;
margin:0 auto;
}
.player-info{margin-top:18px}
.time-display,.progress-container{
width:100%;
max-width:320px;
}
.volume-container{
order:1;
width:100%;
justify-content:center;
margin-top:10px;
padding:0;
background:transparent;
border:none;
box-shadow:none;
gap:8px;
}
.volume-container i{font-size:14px}
.volume-container .volume-slider{width:100%}
.play-mode-btn{order:2;margin-top:10px}
body.player-layout-apple-music .volume-container{
width:100%;
max-width:320px;
justify-content:center;
}
}
@media (max-width:480px){
.volume-container,
body.player-layout-apple-music .volume-container{
width:min(100%,168px);
}
}

</style></head><body>
<div class="pip-wrapper">
  <!-- 专辑图 -->
  <div class="pip-artwork" id="pipArtwork">
    <div class="pip-artwork-stage">
      <div class="pip-artwork-placeholder" id="pipArtPlaceholder"><i class="fas fa-music"></i></div>
    </div>
    <div class="pip-artwork-progress-ring" id="pipArtProgressRing" aria-hidden="true"></div>
    <div class="pip-artwork-controls">
      <button class="pip-ctrl-btn" id="pipPrev" title="上一首"><i class="fas fa-backward"></i></button>
      <button class="pip-ctrl-btn pip-ctrl-play" id="pipPlay">${isPlayingNow ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>'}</button>
      <button class="pip-ctrl-btn" id="pipNext" title="下一首"><i class="fas fa-forward"></i></button>
    </div>
  </div>
  <!-- 信息栏 -->
  <div class="pip-info-bar">
    <div class="pip-info-text">
      <div class="pip-info-title" id="pipTitle">${escapeHtml(songName)}</div>
      <div class="pip-info-artist" id="pipArtist">${escapeHtml(rawArtist)}</div>
    </div>
    <div class="pip-info-actions">
      <button class="pip-info-btn pip-mode-btn" id="pipModeBtn" title="播放模式"><i class="fas fa-repeat"></i></button>
      <button class="pip-info-btn" id="pipListBtn" title="播放列表">☰</button>
    </div>
  </div>
  <!-- 播放列表面板 -->
  <div class="pip-playlist-panel" id="pipPlaylistPanel">
    <div class="pip-playlist-header">
      <input type="text" class="pip-playlist-search" id="pipSearchInput" placeholder="搜索播放列表..." />
      <button class="pip-playlist-close-btn" id="pipPlaylistClose">✕</button>
    </div>
    <div class="pip-playlist-list" id="pipPlaylistList"></div>
  </div>
</div>
<script>
const $=id=>document.getElementById(id);
let pipData={playlist:[],currentId:null,isPlaying:false,searchQuery:''};
let pipLastProgressPercent=-1;

function escapeHtml(s){const d=document.createElement('div');d.textContent=s||'';return d.innerHTML;}

// ===== 封面更新 =====
let coverLoaded=false;
function updateCover(){
  if(window.__pipCoverUrl && !coverLoaded){
    const img=new Image();
    img.onload=()=>{
      const ph=$('pipArtPlaceholder');ph.style.display='none';
      const el=document.createElement('img');el.src=window.__pipCoverUrl;el.className='pip-artwork-img';el.id='pipArtImg';
      const stage=$('pipArtwork').querySelector('.pip-artwork-stage')||$('pipArtwork');stage.insertBefore(el,ph);
      coverLoaded=true;
    };
    img.src=window.__pipCoverUrl;
  }
}
updateCover();
window.updatePipCover=function(url){window.__pipCoverUrl=url;coverLoaded=false;updateCover();};

// ===== 按钮事件 =====
$('pipPrev').onclick=function(){window.opener&&window.opener.prevButton&&window.opener.prevButton.click();};
$('pipNext').onclick=function(){window.opener&&window.opener.nextButton&&window.opener.nextButton.click();};
$('pipPlay').onclick=function(){window.opener&&window.opener.playButton&&window.opener.playButton.click();};

// ===== 播放模式 =====
function updateModeBtn(mode){
  const btn=$('pipModeBtn');
  const icons={normal:'<i class="fas fa-repeat"></i>',shuffle:'<i class="fas fa-shuffle"></i>',repeat:'<i class="fas fa-repeat"></i><span style="position:absolute;font-size:8px;font-weight:700;bottom:2px;">1</span>'};
  btn.innerHTML=icons[mode]||icons.normal;
  btn.title={normal:'列表循环',shuffle:'随机播放',repeat:'单曲循环'}[mode]||'播放模式';
  if(mode!=='normal') btn.classList.add('active');
  else btn.classList.remove('active');
}
$('pipModeBtn').onclick=function(){window.opener&&window.opener.pipCyclePlayMode&&window.opener.pipCyclePlayMode();};

// ===== 播放列表面板 =====
let panelOpen=false;
$('pipListBtn').onclick=function(){panelOpen=!panelOpen;$('pipPlaylistPanel').classList.toggle('open',panelOpen);if(panelOpen)refreshPlaylist();};
$('pipPlaylistClose').onclick=function(){panelOpen=false;$('pipPlaylistPanel').classList.remove('open');};

// ===== 搜索 =====
$('pipSearchInput').oninput=function(){
  pipData.searchQuery=this.value.trim().toLowerCase();
  renderPipPlaylist();
};

// ===== 列表渲染 =====
function refreshPlaylist(){
  if(window.opener&&window.opener.pipGetPlaylist){
    pipData.playlist=window.opener.pipGetPlaylist();
    pipData.currentId=window.opener.pipGetCurrentPlayingId();
    pipData.isPlaying=window.opener.pipIsPlaying();
  }
  renderPipPlaylist();
}

function renderPipPlaylist(){
  const list=$('pipPlaylistList');
  let items=pipData.playlist.slice();
  let origIndexMap=new Map();
  items.forEach(function(item,idx){origIndexMap.set(item.id,idx);});

  // 搜索过滤
  if(pipData.searchQuery){
    items=items.filter(function(item){
      const name=(item.name||'').toLowerCase();
      const artist=Array.isArray(item.artist)?item.artist.join(' ').toLowerCase():(item.artist||'').toLowerCase();
      return name.includes(pipData.searchQuery)||artist.includes(pipData.searchQuery);
    });
  }

  if(items.length===0){
    list.innerHTML='<div class="pip-playlist-empty">'+(pipData.searchQuery?'未找到歌曲':'播放列表为空')+'</div>';
    return;
  }

  let html='';
  items.forEach(function(item,di){
    const idx=origIndexMap.get(item.id);
    const artists=Array.isArray(item.artist)?item.artist.join(' / '):(item.artist||'');
    const isPlaying=pipData.currentId&&item.id===pipData.currentId;
    html+='<div class="pip-playlist-item'+(isPlaying?' playing':'')+'" data-index="'+idx+'">'+
      '<div class="pip-pl-num">'+(isPlaying?'▶':(di+1))+'</div>'+
      '<div class="pip-pl-info">'+
        '<div class="pip-pl-name">'+escapeHtml(item.name||'未知歌曲')+'</div>'+
        '<div class="pip-pl-artist">'+escapeHtml(artists)+'</div>'+
      '</div>'+
      '<button class="pip-pl-remove" data-index="'+idx+'">×</button>'+
    '</div>';
  });
  list.innerHTML=html;

  // 委托事件
  list.querySelectorAll('.pip-playlist-item').forEach(function(row){
    row.onclick=function(e){
      if(e.target.closest('.pip-pl-remove'))return;
      const i=parseInt(row.dataset.index,10);
      if(!isNaN(i)&&window.opener&&window.opener.pipPlayFromPlaylist){
        window.opener.pipPlayFromPlaylist(i);
        pipData.currentId=itemIdFromIndex(i);
        renderPipPlaylist();
      }
    };
  });
  list.querySelectorAll('.pip-pl-remove').forEach(function(btn){
    btn.onclick=function(e){
      e.stopPropagation();
      const i=parseInt(btn.dataset.index,10);
      if(!isNaN(i)&&window.opener&&window.opener.pipRemoveFromPlaylist){
        window.opener.pipRemoveFromPlaylist(i);
        setTimeout(refreshPlaylist,200);
      }
    };
  });
}

function itemIdFromIndex(idx){
  const pl=pipData.playlist;
  return (pl&&idx>=0&&idx<pl.length)?pl[idx].id:null;
}

function setPipProgress(percent){
  const ring=$('pipArtProgressRing');
  const safePercent=Math.min(100,Math.max(0,Number(percent)||0));
  if(!ring||safePercent===pipLastProgressPercent)return;
  ring.style.setProperty('--pip-progress',(safePercent*3.6)+'deg');
  pipLastProgressPercent=safePercent;
}

window.updatePipProgress=setPipProgress;

// ===== 状态同步 =====
window.updatePipState=function(playing,title,artist,currentId){
  $('pipPlay').innerHTML=playing?'<i class="fas fa-pause"></i>':'<i class="fas fa-play"></i>';
  $('pipTitle').textContent=title||'Harmonia';
  $('pipArtist').textContent=artist||'';
  if(currentId!==undefined){
    pipData.currentId=currentId;
    pipData.isPlaying=playing;
    if(panelOpen)renderPipPlaylist();
  }
  // 同步播放模式
  if(window.opener&&window.opener.pipGetPlayMode){
    updateModeBtn(window.opener.pipGetPlayMode());
  }
};

// 初始同步播放模式
if(window.opener&&window.opener.pipGetPlayMode){
  updateModeBtn(window.opener.pipGetPlayMode());
}
<\/script></body></html>`;
    }

    function escapeHtml(str) {
      const d = document.createElement('div');
      d.textContent = str || '';
      return d.innerHTML;
    }

    async function openPipPlayer() {
      if (!PIP_SUPPORTED) {
        showError('当前浏览器不支持画中画功能（需要 Chrome 116+）', 3500);
        return;
      }
      if (pipWindow) {
        pipWindow.focus();
        return;
      }
      try {
        pipWindow = await documentPictureInPicture.requestWindow({
          width: 340,
          height: 450
        });
        pipWindow.document.write(buildPipContent());
        pipWindow.document.close();

        // 注入封面 URL
        if (albumArt && albumArt.src) {
          pipWindow.updatePipCover?.(albumArt.src);
        }
        updatePipProgress(getPlaybackProgressPercent(), true);

        pipBtn.classList.add('pip-active');

        pipWindow.addEventListener('pagehide', () => {
          pipWindow = null;
          pipBtn.classList.remove('pip-active');
          if (pipUpdateInterval) { clearInterval(pipUpdateInterval); pipUpdateInterval = null; }
        });

        // 定期同步播放状态到 PiP 窗口
        pipUpdateInterval = setInterval(() => {
          if (!pipWindow || pipWindow.closed) {
            clearInterval(pipUpdateInterval);
            pipUpdateInterval = null;
            pipWindow = null;
            pipBtn.classList.remove('pip-active');
            return;
          }
          try {
            const sn = currentSongInfo?.name || 'Harmonia';
            const ra = (currentSongInfo?.artist || '').replace(/^[^·]*·\s*/, '');
            pipWindow.updatePipState?.(isPlaying, sn, ra, currentPlayingId);
            if (albumArt && albumArt.src) {
              pipWindow.updatePipCover?.(albumArt.src);
            }
            updatePipProgress(getPlaybackProgressPercent());
          } catch (_) {}
        }, 500);
      } catch (e) {
        console.warn('[PiP] 打开失败:', e?.message || e);
        showError('打开 Mini 播放器失败', 2500);
      }
    }

    function closePipPlayer() {
      if (pipWindow && !pipWindow.closed) {
        pipWindow.close();
      }
      pipWindow = null;
      if (pipUpdateInterval) { clearInterval(pipUpdateInterval); pipUpdateInterval = null; }
      if (pipBtn) pipBtn.classList.remove('pip-active');
    }

    // 按钮事件
    if (pipBtn) {
      pipBtn.addEventListener('click', () => {
        if (pipWindow && !pipWindow.closed) {
          closePipPlayer();
        } else {
          openPipPlayer();
        }
      });
    }

    // 移动端隐藏 PiP 按钮
    if (isMobile()) {
      if (pipBtn) pipBtn.style.display = 'none';
    }

    // ====================================================================
    // 模块 5: 快捷键系统
    // ====================================================================
    const SHORTCUTS = [
      { key: ' ', desc: '播放 / 暂停', action() { if (/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) return; playButton.click(); } },
      { key: 'ArrowLeft', desc: '上一曲', action() { if (/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) return; prevButton.click(); } },
      { key: 'ArrowRight', desc: '下一曲', action() { if (/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) return; nextButton.click(); } },
      { key: 'ArrowUp', desc: '音量 +5%', action() { if (/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) return; const v = Math.min(1, parseFloat(volumeSlider.value || 0.7) + 0.05); volumeSlider.value = v; audioPlayer.volume = v; if (audioPlayerB) audioPlayerB.volume = v; } },
      { key: 'ArrowDown', desc: '音量 -5%', action() { if (/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) return; const v = Math.max(0, parseFloat(volumeSlider.value || 0.7) - 0.05); volumeSlider.value = v; audioPlayer.volume = v; if (audioPlayerB) audioPlayerB.volume = v; } },
      { key: 'l', desc: '切换歌词', action() { if (/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) return; toggleLyrics(); } },
      { key: 't', desc: '切换主题', action() { if (/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) return; toggleTheme(); } },
      { key: 's', desc: '聚焦搜索', action() { if (isDynamicIslandExpanded && searchInput) { searchInput.focus(); searchInput.select(); } else if (!isDynamicIslandExpanded) { toggleDynamicIsland(); setTimeout(() => { if (searchInput) { searchInput.focus(); searchInput.select(); } }, 450); } } },
      { key: 'm', desc: '侧栏', action() { if (/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) return; sidebar.classList.contains('active') ? closeSidebar() : openSidebar(); } },
      { key: 'r', desc: '播放模式', action() { if (/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) return; if (playModeBtn) playModeBtn.click(); } },
      { key: 'p', desc: '分享卡片', action() { if (/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) return; openPosterModal(); } },
      { key: 'd', desc: 'Mini 播放器', action() { if (/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) return; if (pipWindow && !pipWindow.closed) { closePipPlayer(); } else { openPipPlayer(); } } },
      { key: 'Escape', desc: '关闭弹窗', action() { if (posterModalOverlay?.classList.contains('active')) closePosterModal(); if (settingsModalOverlay?.classList.contains('active')) { settingsModalOverlay.classList.remove('active'); document.body.classList.remove('settings-modal-open'); } if (mvModalOverlay?.classList.contains('active')) closeMvModal(); if (lyricsRerequestModalOverlay?.classList.contains('active')) closeLyricsRerequestDialog(); if (isDynamicIslandExpanded) toggleDynamicIsland(); } },
      { key: '/', desc: '快捷键列表', action() { showShortcutsHelp(); } },
    ];
    function showShortcutsHelp() {
      // 打开设置界面并切换到快捷键标签页
      if (!settingsModalOverlay.classList.contains('active')) {
        settingsModalOverlay.classList.add('active');
        document.body.classList.add('settings-modal-open');
      }
      const shortcutsTab = document.querySelector('.nav-item[data-tab="shortcuts"]');
      if (shortcutsTab) shortcutsTab.click();
    }
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') { e.preventDefault(); if (!(posterModalOverlay?.classList.contains('active')) && !(settingsModalOverlay?.classList.contains('active')) && !(mvModalOverlay?.classList.contains('active'))) toggleDynamicIsland(); return; }
      if (e.key === 'Escape') { const sc = SHORTCUTS.find(s => s.key === 'Escape'); if (sc) sc.action(); return; }
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;
      let key = e.key;
      if (key === '?') key = '/';
      const sc = SHORTCUTS.find(s => s.key === key);
      if (sc) { e.preventDefault(); sc.action(); }
    });

    // ====================================================================
    // FAB 菜单
    // ====================================================================
    (function initFabMenu() {
      const menu = document.getElementById('fabMenu');
      const main = document.getElementById('fabMain');
      const items = document.querySelectorAll('.fab-item');
      if (!menu || !main) return;

      // 展开/收起
      main.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('expanded');
      });

      // 点击菜单外部收起
      document.addEventListener('click', (e) => {
        if (!menu.contains(e.target)) {
          menu.classList.remove('expanded');
        }
      });

      // 子按钮动作映射
      items.forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = item.dataset.action;
          switch (action) {
            case 'mv':
              document.getElementById('mvButton').click();
              break;
            case 'share':
              document.getElementById('shareBtn').click();
              break;
            case 'pip':
              document.getElementById('pipBtn').click();
              break;
            case 'lyrics-rerequest':
              document.getElementById('lyricsRerequestBtn').click();
              break;
            case 'theme':
              document.getElementById('themeToggle').click();
              break;
            case 'settings':
              document.getElementById('settingsToggle').click();
              break;
          }
          menu.classList.remove('expanded');
        });
      });

      // 主题按钮图标同步
      const themeItem = document.querySelector('.fab-item[data-action="theme"]');
      if (themeItem) {
        const syncThemeIcon = () => {
          themeItem.innerHTML = document.getElementById('themeToggle').innerHTML || '<i class="fas fa-moon"></i>';
        };
        syncThemeIcon();
        setInterval(syncThemeIcon, 500);
      }
      // PiP 激活态同步
      const pipItem = document.querySelector('.fab-item[data-action="pip"]');
      if (pipItem) {
        const origPipActive = pipBtn ? pipBtn.classList : null;
        setInterval(() => {
          if (origPipActive && origPipActive.contains('pip-active')) {
            pipItem.style.background = 'var(--primary-gradient) !important';
            pipItem.style.color = '#fff';
            pipItem.style.borderColor = 'rgba(255,45,85,0.4)';
          } else {
            pipItem.style.background = '';
            pipItem.style.color = '';
            pipItem.style.borderColor = '';
          }
        }, 500);
      }
    })();

    // ====================================================================
    // 底部工具栏（翻译/关闭歌词）
    // ====================================================================
    (function initLyricsToolbar() {
      const toolbar = document.getElementById('lyricsToolbar');
      const translateBtn = document.getElementById('translateToggleBtn');
      const closeLyricsBtn = document.getElementById('closeLyricsBtn');
      if (!toolbar || !translateBtn || !closeLyricsBtn) return;

      /** 显示/隐藏工具栏（存在 rightcontent 时始终显示） */
      function updateToolbarVisibility() {
        const hasRightContent = document.getElementById('rightcontent');
        if (hasRightContent) {
          toolbar.classList.add('visible');
        } else {
          toolbar.classList.remove('visible');
        }
      }

      /** 同步翻译按钮高亮状态 */
      function syncTranslateBtnState() {
        if (translationSettings.enabled) {
          translateBtn.classList.add('active');
          translateBtn.title = '关闭翻译或罗马音';
        } else {
          translateBtn.classList.remove('active');
          translateBtn.title = '开启翻译或罗马音';
        }
      }

      // --- 翻译/罗马音开关 ---
      translateBtn.addEventListener('click', async () => {
        translationSettings.enabled = !translationSettings.enabled;
        localStorage.setItem('translationEnabled', translationSettings.enabled ? '1' : '0');
        syncTranslateBtnState();

        if (translationSettings.enabled) {
          document.body.classList.remove('lyrics-translation-hidden');
          showDynamicIslandToast('已开启歌词翻译 / 罗马音', 1800);
        } else {
          document.body.classList.add('lyrics-translation-hidden');
          showDynamicIslandToast('已关闭歌词翻译 / 罗马音', 1800);
        }

        // AMLL 模式下需重新 setLyricLines，让库按最新翻译可见性重绘
        if (isAMLLRendererMode() && amllPlayer && amllActive && Array.isArray(amLyricsData) && amLyricsData.length > 0) {
          try {
            const currentMs = Math.round((audioPlayer.currentTime || 0) * 1000);
            const lines = translationSettings.enabled
              ? amLyricsData
              : amLyricsData.map(line => ({ ...line, translatedLyric: '', translated: '', romanLyric: '' }));
            amllPlayer.setLyricLines(lines, currentMs);
            amllPlayer.setCurrentTime(currentMs, true);
            amllPlayer.update(0);
          } catch (e) {
            console.warn('[toolbar] AMLL 翻译切换失败:', e);
          }
        }

        // legacy 模式：触发兼容渲染重绘
        if (!isAMLLRendererMode() && amLyricsData.length > 0 && lastLyric >= 0) {
          UpdateLyricsLayout(lastLyric, [lastLyric], amLyricsData, 0);
        }
      });

      // --- 关闭歌词按钮 ---
      closeLyricsBtn.addEventListener('click', () => {
        if (isMobile()) {
          // 移动端：直接切换歌词全屏（无论当前状态）
          toggleLyrics();
          return;
        }
        // 桌面端：切换居中模式
        const body = document.body;
        if (body.classList.contains('lyrics-closed')) {
          // 已关闭 → 恢复歌词
          body.classList.remove('lyrics-closed');
          rightcontent.classList.remove('hidden');
          lyricsVisible = true;
          closeLyricsBtn.classList.remove('active');
          closeLyricsBtn.title = '关闭歌词';
          showDynamicIslandToast('已开启歌词', 1500);
          // 重新计算布局
          setTimeout(() => {
            LYRICS_OFFSET = calculateLyricsOffset();
            if (amLyricsData.length > 0 && lastLyric >= 0) {
              UpdateLyricsLayout(lastLyric, [lastLyric], amLyricsData, 0);
            }
            resizeAMLLPlayer();
          }, 50);
        } else {
          // 关闭歌词 → 居中控件
          body.classList.add('lyrics-closed');
          lyricsVisible = false;
          closeLyricsBtn.classList.add('active');
          closeLyricsBtn.title = '开启歌词';
          showDynamicIslandToast('已关闭歌词', 1500);
        }
      });

      // --- 暴露外部供 toggleLyrics 同步按钮状态 ---
      window.__syncLyricsToolbar = function() {
        const body = document.body;
        // 桌面端用 lyrics-closed 类；移动端用 lyricsVisible（全屏状态）
        const isClosed = isMobile() ? !lyricsVisible : body.classList.contains('lyrics-closed');
        if (isClosed) {
          closeLyricsBtn.classList.add('active');
          closeLyricsBtn.title = '开启歌词';
        } else {
          closeLyricsBtn.classList.remove('active');
          closeLyricsBtn.title = '关闭歌词';
        }
        syncTranslateBtnState();
        updateToolbarVisibility();
      };

      // --- 窗口尺寸变化时同步 ---
      window.addEventListener('resize', updateToolbarVisibility);

      // --- 初始化 ---
      // 读取翻译设置
      if (localStorage.getItem('translationEnabled') === '1') {
        translationSettings.enabled = true;
      } else {
        document.body.classList.add('lyrics-translation-hidden');
      }
      syncTranslateBtnState();
      updateToolbarVisibility();
    })();

    // ====================================================================
    // 初始化
    // ====================================================================
    (function initNewFeatures() {
    })();
