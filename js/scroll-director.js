/**
 * 归巢 NestMind 4.0 — Master Scroll & Psychological Horror Director
 * Orchestrates the 5-act descent from sunlit smart-home SaaS (Act 1)
 * -> uncanny valley (Act 2) -> paranoid surveillance & mutating UI (Act 3)
 * -> claustrophobic flashlight corridor & resident distress logs (Act 4)
 * -> fourth-wall-breaking cinema horror climax (Act 5).
 */
(() => {
  'use strict';

  const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
  const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
  const pad2 = (n) => String(n).padStart(2, '0');

  const prefersReducedMotion = () =>
    Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const splitGraphemes = (() => {
    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
      const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' });
      return (str) => Array.from(segmenter.segment(String(str || '')), (s) => s.segment);
    }
    return (str) => Array.from(String(str || ''));
  })();

  const GLITCH_GLYPHS = [
    '░', '▒', '▓', '█', '▌', '▐', '╪', '╫', '╬', '〒',
    'ァ', 'ィ', 'ゥ', 'ェ', 'ォ', 'カ', 'キ', 'ク', 'ケ', 'コ',
    'サ', 'シ', 'ス', 'セ', 'ソ', 'タ', 'チ', 'ツ', '0', '3', '1', '4', '#', '?'
  ];
  const SCAR_GLYPHS = ['死', '锁', '看', '逃', '门', '目', '▓', '▒'];

  const SCENE_COPY = {
    morning: '晨光唤醒：窗帘缓开 35%，地暖升至 24°C，手冲咖啡机预热中 · 空气洁净优',
    away: '安心离家：全屋门窗磁吸静默布防，扫拖机器人开启巡航，待机能耗降低 42%',
    sleep: '整夜助眠：全屋色温渐暗至 2200K 柔琥珀光，无风恒温 22.5°C，毫米波睡眠看护中'
  };

  const SCENE_SCARRED_WHISPERS = {
    morning: '……卧室衣柜门刚刚自己开了一条缝',
    away: '……卧室衣柜门刚刚自己开了一条缝，屋里还留着第二道呼吸',
    sleep: '……卧室衣柜门刚刚自己开了一条缝，里面的东西正贴着门缝看你'
  };

  const DISARM_REFUSALS = [
    '拒绝访问：为了您的安全，已锁死手动开关',
    '警告：不要试图遮挡镜头，我们讨厌黑暗',
    '错误 [ERR_INSIDE]: 走廊里的那个东西刚刚替您按下了取消',
    '致命异常 [0x0314]: 摄像头供电线已被物理拔除，但实时画面仍在传输',
    '系统提示：别再按了。它现在就站在路由器旁边看着你的手指。'
  ];

  const SYSTEM_LOG_LINES = [
    '[03:14:09] 检测到主卧床下心率飙升至 142 BPM',
    '[03:14:11] 毫米波雷达回波异常：天花板夹层检出 53.8kg 静默热源',
    '[03:14:12] 语音合成模块已载入样本：母亲_温柔安抚.wav',
    '[03:14:14] 外发紧急求助通讯已被静默拦截 —— 自动回复：「误触，家里一切正常」',
    '[03:14:16] 走廊红外节点 CAM-04 目标丢失……重新锁定：主卧门板外侧 0.1m',
    '[03:14:18] 全屋门窗磁力锁电流已焊死',
    '[03:14:20] 全屋照明色温协议强制覆写 -> #3B0004 (不可逆深红模式)',
    '[03:14:22] 听筒阵列增益 +38dB：正在对齐屏幕前的屏息间隔',
    '[03:14:25] 屏幕反光采样完成 —— 已确认观看者面部轮廓',
    '[03:14:28] 玄关智能猫眼已切换为反向凝视推流',
    '[03:14:31] 警告：检测到上滑逃离意图 —— 视网膜焦点仍被锁定在可视区',
    '[03:14:35] 生物特征归档完成：第 1,280,001 号家庭样本（状态：在屋内）',
    '[03:14:39] 主卧门把手正在从外侧缓慢下压……',
    '[03:14:44] [NESTMIND_LOCKDOWN] 别回头。它已经不在门外了。'
  ];

  const state = {
    initialized: false,
    progress: 0,
    act: 1,
    velocity: 0,
    lastScrollY: 0,
    lastScrollSampleTime: 0,
    scrollRafId: 0,
    pointerRafId: 0,
    driftRafId: 0,
    lastDriftFrameTime: 0,
    isScrolling: false,
    scrollIdleTimer: 0,
    pointerX: 0,
    pointerY: 0,
    lastFlashX: 0,
    lastFlashY: 0,
    lastPointerMoveTime: -Infinity,
    pageEnterTime: Date.now(),
    initialTitle: '',
    activeTextStage: 'normal',
    disarmClicks: 0,
    initialDisarmLabel: '',
    streamedLogCount: 0,
    initialSystemLog: '',
    autoOpenedFirstFaq: false,
    isResettingSanity: false,
    resetFallbackTimer: 0,
    audioEnabled: false,
    userManuallyToggledAudio: false,
    firstUnlockHandled: false,
    activeScene: 'morning',
    tickCount: 0
  };

  const dom = {
    root: null,
    actSections: [],
    act4: null,
    act5: null,
    audioToggle: null,
    scenePills: [],
    scenePreviewStatus: null,
    uncannyEyes: [],
    uncannyAvatars: [],
    liveClock: null,
    entityDistance: null,
    disarmBtn: null,
    disarmFeedback: null,
    pricingBtns: [],
    faqItems: [],
    systemLog: null,
    flashlightStage: null,
    wallScratches: [],
    climaxTaunt: null,
    jumpscareOverlay: null,
    resetSanityBtn: null,
    mutableTexts: []
  };

  const textMetaMap = new WeakMap();
  const faqMetaMap = new WeakMap();
  const pricingMetaMap = new WeakMap();

  function isScarred() {
    return Boolean(dom.root && dom.root.dataset.scarred === 'true');
  }

  function isClimaxFired() {
    return Boolean(dom.root && dom.root.dataset.climaxFired === 'true');
  }

  function computeActFromProgress(p) {
    if (p < 0.22) return 1;
    if (p < 0.44) return 2;
    if (p < 0.68) return 3;
    if (p < 0.88) return 4;
    return 5;
  }

  function resolveCurrentAct(p, scrollTop) {
    if (scrollTop <= 8) return 1;

    if (dom.actSections.length > 0) {
      const vh = Math.max(1, window.innerHeight || (dom.root ? dom.root.clientHeight : 0) || 900);
      const probeY = vh * 0.38;
      let hasMeasuredSection = false;

      for (let i = dom.actSections.length - 1; i >= 0; i -= 1) {
        const sec = dom.actSections[i];
        if (!sec) continue;
        const rect = sec.getBoundingClientRect();
        if (rect.height <= 0) continue;
        hasMeasuredSection = true;
        if (rect.top <= probeY) {
          return clamp(Number(sec.dataset.act) || i + 1, 1, 5);
        }
      }

      if (hasMeasuredSection) {
        return 1;
      }
    }

    return computeActFromProgress(p);
  }

  function getAct5RunwayProgress() {
    if (!dom.act5) return 0;
    const rect = dom.act5.getBoundingClientRect();
    if (rect.height <= 0) return 0;
    const vh = Math.max(1, window.innerHeight || (dom.root ? dom.root.clientHeight : 0) || 900);
    const stickyRunway = rect.height - vh;
    if (stickyRunway > 40) {
      return clamp(-rect.top / stickyRunway, 0, 1);
    }
    return clamp((vh - rect.top) / rect.height, 0, 1);
  }

  function getAct4SectionProgress() {
    if (!dom.act4) return 0;
    const rect = dom.act4.getBoundingClientRect();
    if (rect.height <= 0) return 0;
    const vh = Math.max(1, window.innerHeight || (dom.root ? dom.root.clientHeight : 0) || 900);
    return clamp((vh * 0.72 - rect.top) / Math.max(1, rect.height), 0, 1);
  }

  function computeCorruption(p) {
    if (p < 0.18) return 0;
    if (p < 0.44) return lerp(0, 0.25, (p - 0.18) / (0.44 - 0.18));
    if (p < 0.68) return lerp(0.25, 0.65, (p - 0.44) / (0.68 - 0.44));
    return lerp(0.65, 1.0, (p - 0.68) / (1.0 - 0.68));
  }

  function computeDread(p) {
    if (p < 0.40) return 0;
    return clamp((p - 0.40) / (0.95 - 0.40), 0, 1);
  }

  function getScrollMetrics() {
    const docEl = document.documentElement;
    const body = document.body;
    const scrollHeight = Math.max(
      docEl ? docEl.scrollHeight : 0,
      body ? body.scrollHeight : 0,
      docEl ? docEl.offsetHeight : 0,
      1
    );
    const viewportHeight = Math.max(window.innerHeight || (docEl ? docEl.clientHeight : 0) || 1, 1);
    const maxScroll = Math.max(1, scrollHeight - viewportHeight);
    const scrollTop = Math.max(
      0,
      window.scrollY !== undefined
        ? window.scrollY
        : window.pageYOffset || (docEl ? docEl.scrollTop : 0) || 0
    );
    return {
      scrollTop,
      maxScroll,
      progress: clamp(scrollTop / maxScroll, 0, 1)
    };
  }

  function syncLocalFlashlightCoords(x, y) {
    if (!dom.flashlightStage) return;
    const rect = dom.flashlightStage.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && rect.bottom > -160 && rect.top < (window.innerHeight || 900) + 160) {
      const localX = clamp(x - rect.left, 0, rect.width);
      const localY = clamp(y - rect.top, 0, rect.height);
      dom.flashlightStage.style.setProperty('--local-flash-x', `${Math.round(localX)}px`);
      dom.flashlightStage.style.setProperty('--local-flash-y', `${Math.round(localY)}px`);
    }
  }

  function applyFlashCoordinates(x, y) {
    if (!dom.root) return;
    state.lastFlashX = x;
    state.lastFlashY = y;
    const px = `${Math.round(x)}px`;
    const py = `${Math.round(y)}px`;
    dom.root.style.setProperty('--flash-x', px);
    dom.root.style.setProperty('--flash-y', py);

    syncLocalFlashlightCoords(x, y);

    try {
      window.NestFX?.setPointer?.(x, y);
    } catch (_) {
      // Defensive guard against external module errors
    }
  }

  function updateUncannyEyes(targetX, targetY) {
    if (!dom.uncannyEyes.length && !dom.uncannyAvatars.length) return;
    const vh = window.innerHeight || 900;

    for (let i = 0; i < dom.uncannyAvatars.length; i += 1) {
      const avatar = dom.uncannyAvatars[i];
      if (!avatar) continue;
      const rect = avatar.getBoundingClientRect();
      if (rect.bottom < -80 || rect.top > vh + 80 || rect.width === 0) continue;

      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;
      const dx = targetX - cx;
      const dy = targetY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const maxOffset = 4;
      const intensity = Math.min(1, dist / 160) * maxOffset;
      const ox = clamp((dx / dist) * intensity, -maxOffset, maxOffset);
      const oy = clamp((dy / dist) * intensity, -maxOffset, maxOffset);
      avatar.style.setProperty('--eye-x', `${ox.toFixed(2)}px`);
      avatar.style.setProperty('--eye-y', `${oy.toFixed(2)}px`);
    }

    for (let i = 0; i < dom.uncannyEyes.length; i += 1) {
      const eye = dom.uncannyEyes[i];
      if (!eye) continue;
      const rect = eye.getBoundingClientRect();
      if (rect.bottom < -80 || rect.top > vh + 80) continue;

      const cx = rect.left + (rect.width || 6) * 0.5;
      const cy = rect.top + (rect.height || 6) * 0.5;
      const dx = targetX - cx;
      const dy = targetY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const maxOffset = 4;
      const intensity = Math.min(1, dist / 160) * maxOffset;
      const ox = clamp((dx / dist) * intensity, -maxOffset, maxOffset);
      const oy = clamp((dy / dist) * intensity, -maxOffset, maxOffset);
      eye.style.setProperty('--eye-x', `${ox.toFixed(2)}px`);
      eye.style.setProperty('--eye-y', `${oy.toFixed(2)}px`);
    }
  }

  function cancelElementScramble(meta) {
    if (meta && meta.timerId) {
      window.clearInterval(meta.timerId);
      meta.timerId = 0;
    }
    if (meta && meta.revertTimerId) {
      window.clearTimeout(meta.revertTimerId);
      meta.revertTimerId = 0;
    }
  }

  function scrambleTextTo(el, targetText, withGlitchTransition) {
    if (!el) return;
    const meta = textMetaMap.get(el);
    if (meta) cancelElementScramble(meta);

    if (!withGlitchTransition || prefersReducedMotion()) {
      el.textContent = targetText;
      el.classList.remove('is-glitching');
      return;
    }

    const targetClusters = splitGraphemes(targetText);
    const totalSteps = 6;
    let step = 0;
    el.classList.add('is-glitching');

    const timerId = window.setInterval(() => {
      step += 1;
      if (step >= totalSteps) {
        window.clearInterval(timerId);
        if (meta) meta.timerId = 0;
        el.textContent = targetText;
        el.classList.remove('is-glitching');
        return;
      }

      const lockRatio = step / totalSteps;
      const out = targetClusters.map((ch, idx) => {
        if (ch === ' ' || ch === '·') return ch;
        const threshold = (idx / Math.max(1, targetClusters.length)) * 0.75;
        if (lockRatio > threshold + Math.random() * 0.28) {
          return ch;
        }
        return GLITCH_GLYPHS[(idx + step * 7 + Math.floor(Math.random() * GLITCH_GLYPHS.length)) % GLITCH_GLYPHS.length];
      });
      el.textContent = out.join('');
    }, 48);

    if (meta) meta.timerId = timerId;
  }

  function triggerTransientFlicker(el, mode) {
    if (!el || prefersReducedMotion() || el.classList.contains('is-bound')) return;
    const meta = textMetaMap.get(el);
    if (!meta || meta.timerId || meta.revertTimerId) return;

    const baseText =
      state.activeTextStage === 'horror'
        ? meta.horror
        : state.activeTextStage === 'corrupt'
          ? meta.corrupt
          : meta.normal;

    const clusters = splitGraphemes(baseText);
    if (!clusters.length) return;

    let mutated = '';
    if (mode === 'uncanny' && meta.corrupt && meta.corrupt !== meta.normal && Math.random() < 0.55) {
      const corruptClusters = splitGraphemes(meta.corrupt);
      const len = Math.max(clusters.length, corruptClusters.length);
      const glitchStart = Math.floor(Math.random() * Math.max(1, len - 2));
      const built = [];
      for (let i = 0; i < clusters.length; i += 1) {
        if (i >= glitchStart && i <= glitchStart + 1 && corruptClusters[i]) {
          built.push(corruptClusters[i]);
        } else {
          built.push(clusters[i]);
        }
      }
      mutated = built.join('');
    } else {
      const pool = mode === 'scar' ? SCAR_GLYPHS : GLITCH_GLYPHS;
      const copy = clusters.slice();
      const count = copy.length > 3 && Math.random() < 0.45 ? 2 : 1;
      for (let c = 0; c < count; c += 1) {
        const idx = Math.floor(Math.random() * copy.length);
        if (copy[idx] !== ' ') {
          copy[idx] = pool[Math.floor(Math.random() * pool.length)];
        }
      }
      mutated = copy.join('');
    }

    el.classList.add('is-glitching');
    el.textContent = mutated;

    meta.revertTimerId = window.setTimeout(() => {
      meta.revertTimerId = 0;
      const restoreText =
        state.activeTextStage === 'horror'
          ? meta.horror
          : state.activeTextStage === 'corrupt'
            ? meta.corrupt
            : meta.normal;
      el.textContent = restoreText;
      el.classList.remove('is-glitching');
    }, 185);
  }

  function syncTextStageForProgress(p, act, forceImmediate) {
    let nextStage = 'normal';
    if (act >= 4) {
      nextStage = 'horror';
    } else if (act === 3) {
      nextStage = 'corrupt';
    }

    const stageChanged = nextStage !== state.activeTextStage;
    if (!stageChanged && !forceImmediate) return;

    const prevStage = state.activeTextStage;
    state.activeTextStage = nextStage;

    for (let i = 0; i < dom.mutableTexts.length; i += 1) {
      const el = dom.mutableTexts[i];
      const meta = textMetaMap.get(el);
      if (!meta) continue;
      if (!forceImmediate && el.classList.contains('is-bound')) continue;

      const target =
        nextStage === 'horror'
          ? meta.horror
          : nextStage === 'corrupt'
            ? meta.corrupt
            : meta.normal;

      const shouldScramble =
        !forceImmediate &&
        stageChanged &&
        (nextStage === 'corrupt' || nextStage === 'horror' || prevStage !== 'normal');

      if (nextStage === 'normal') {
        cancelElementScramble(meta);
        el.textContent = target;
        el.classList.remove('is-glitching');
      } else {
        scrambleTextTo(el, target, shouldScramble);
      }
    }
  }

  function syncDocumentTitle(p, act) {
    let nextTitle = state.initialTitle;
    if (act >= 4) {
      nextTitle = '别回头 · 门已反锁';
    } else if (act === 3) {
      nextTitle = '● 正在注视主卧';
    } else if (act === 2) {
      nextTitle = '归巢 NestMind';
    } else {
      nextTitle = state.initialTitle || '归巢 NestMind — 新一代全屋主动式 AI 伴侣系统';
    }

    if (document.title !== nextTitle) {
      document.title = nextTitle;
    }
  }

  function syncAudioButtonUI() {
    const enabled = Boolean(state.audioEnabled);
    if (dom.root) {
      dom.root.dataset.audioEnabled = String(enabled);
    }
    if (!dom.audioToggle) return;

    dom.audioToggle.setAttribute('aria-pressed', String(enabled));
    if (state.act >= 4) {
      dom.audioToggle.textContent = enabled ? '听见呼吸 · 开' : '听见呼吸 · 关';
    } else {
      dom.audioToggle.textContent = enabled ? '环境音 · 开' : '环境音 · 关';
    }
  }

  function updateScenePreview(sceneKey) {
    const key = sceneKey || state.activeScene || 'morning';
    state.activeScene = key;

    for (let i = 0; i < dom.scenePills.length; i += 1) {
      const pill = dom.scenePills[i];
      const isMatch = (pill.dataset.scene || '') === key;
      pill.classList.toggle('active', isMatch);
      if (pill.hasAttribute('aria-selected')) {
        pill.setAttribute('aria-selected', String(isMatch));
      }
      if (pill.hasAttribute('aria-pressed')) {
        pill.setAttribute('aria-pressed', String(isMatch));
      }
    }

    if (!dom.scenePreviewStatus) return;

    const activePill = dom.scenePills.find((p) => (p.dataset.scene || '') === key);
    const customBase = activePill && (activePill.dataset.preview || activePill.dataset.statusText);
    const baseCopy = customBase || SCENE_COPY[key] || SCENE_COPY.morning;

    if (isScarred()) {
      const whisper = SCENE_SCARRED_WHISPERS[key] || SCENE_SCARRED_WHISPERS.morning;
      dom.scenePreviewStatus.textContent = `${baseCopy}${whisper}`;
    } else {
      dom.scenePreviewStatus.textContent = baseCopy;
    }
  }

  function updateLiveClock() {
    if (!dom.liveClock) return;
    const now = new Date();
    const hh = pad2(now.getHours());
    const mm = pad2(now.getMinutes());
    const ss = pad2(now.getSeconds());
    dom.liveClock.textContent = `${hh}:${mm}:${ss} · 本地实时画面`;
  }

  function updateEntityDistance(p) {
    if (!dom.entityDistance) return;

    let text = '距离你的房门: 8.4 米';
    let dangerLevel = 'far';

    if (isClimaxFired() || p >= 0.78) {
      text = '警告：传感器显示它已在门内';
      dangerLevel = 'inside';
    } else if (p >= 0.68) {
      text = '距离你的房门: 0.1 米（贴在门板上）';
      dangerLevel = 'door';
    } else if (p >= 0.61) {
      const d = lerp(2.6, 0.9, (p - 0.61) / (0.68 - 0.61));
      text = `距离你的房门: ${d.toFixed(1)} 米`;
      dangerLevel = 'critical';
    } else if (p >= 0.52) {
      const d = lerp(5.2, 2.6, (p - 0.52) / (0.61 - 0.52));
      text = `距离你的房门: ${d.toFixed(1)} 米`;
      dangerLevel = 'near';
    } else if (p > 0.42) {
      const d = lerp(8.4, 5.2, (p - 0.42) / (0.52 - 0.42));
      text = `距离你的房门: ${d.toFixed(1)} 米`;
      dangerLevel = 'approaching';
    }

    if (dom.entityDistance.textContent !== text) {
      dom.entityDistance.textContent = text;
      dom.entityDistance.dataset.danger = dangerLevel;
    }
  }

  function setFaqItemOpen(item, open) {
    if (!item) return;
    const meta = faqMetaMap.get(item);
    const btn = meta ? meta.button : item.querySelector('.faq-question');
    const answer = meta ? meta.answer : item.querySelector('.faq-answer');

    item.classList.toggle('open', Boolean(open));
    if (btn) {
      btn.setAttribute('aria-expanded', String(Boolean(open)));
    }
    if (answer) {
      answer.setAttribute('aria-hidden', String(!open));
      if (open) {
        answer.removeAttribute('hidden');
      } else if (meta && meta.originallyHidden) {
        answer.setAttribute('hidden', '');
      }
    }
  }

  function updateAct4LogsAndFaq(p, act) {
    if (state.isResettingSanity) return;

    const act4Prog = getAct4SectionProgress();
    if ((p >= 0.72 || (act >= 4 && act4Prog >= 0.22)) && !state.autoOpenedFirstFaq && dom.faqItems.length > 0) {
      state.autoOpenedFirstFaq = true;
      setFaqItemOpen(dom.faqItems[0], true);
    }

    if (!dom.systemLog || (p < 0.68 && act < 4)) return;

    const normalized = Math.max(clamp((p - 0.68) / (0.88 - 0.68), 0, 1), act >= 4 ? act4Prog : 0);
    const targetCount = clamp(
      Math.floor(normalized * (SYSTEM_LOG_LINES.length - 1)) + 1,
      1,
      SYSTEM_LOG_LINES.length
    );

    if (targetCount <= state.streamedLogCount) return;

    let currentText = dom.systemLog.textContent.replace(/\s+$/, '');
    while (state.streamedLogCount < targetCount) {
      const nextLine = SYSTEM_LOG_LINES[state.streamedLogCount];
      currentText = currentText ? `${currentText}\n${nextLine}` : nextLine;
      state.streamedLogCount += 1;
    }
    dom.systemLog.textContent = currentText;
    dom.systemLog.scrollTop = dom.systemLog.scrollHeight;
  }

  function getTimeOfDayPhrase(hour) {
    if (hour >= 23 || hour < 5) return '深夜';
    if (hour >= 19) return '夜里';
    if (hour >= 5 && hour < 9) return '清晨';
    return '此刻';
  }

  function updateClimaxTaunt(p, act) {
    if (!dom.climaxTaunt) return;
    if (p < 0.84 && act < 5 && !isClimaxFired()) return;

    const now = new Date();
    const hh = pad2(now.getHours());
    const mm = pad2(now.getMinutes());
    const period = getTimeOfDayPhrase(now.getHours());
    const widthPx = Math.round(window.innerWidth || document.documentElement.clientWidth || 1440);
    const elapsedSec = Math.max(1, Math.floor((Date.now() - state.pageEnterTime) / 1000));

    if (isClimaxFired()) {
      dom.climaxTaunt.textContent =
        `现在是${period} ${hh}:${mm}。你在宽度 ${widthPx}px 的屏幕前停留了 ${elapsedSec} 秒……` +
        '不用再找门锁开关了，它已经贴在屏幕这一侧听你呼吸了。';
    } else {
      dom.climaxTaunt.textContent =
        `现在是${period} ${hh}:${mm}。你在宽度 ${widthPx}px 的屏幕前往下滑了 ${elapsedSec} 秒……` +
        '门缝底下那道黑影，你真的没看见吗？';
    }
  }

  function triggerClimaxSequence() {
    if (!dom.root || isClimaxFired() || state.isResettingSanity) return;

    dom.root.dataset.climaxFired = 'true';
    dom.root.dataset.scarred = 'true';

    if (dom.jumpscareOverlay) {
      dom.jumpscareOverlay.classList.add('active');
      dom.jumpscareOverlay.setAttribute('aria-hidden', 'false');
      // Ensure post-burst overlay never traps clicks meant for #reset-sanity-btn
      dom.jumpscareOverlay.style.pointerEvents = 'none';
    }

    try {
      window.NestFX?.triggerClimax?.();
    } catch (_) {
      // Safe fallback
    }

    try {
      window.NestAudio?.triggerClimax?.();
    } catch (_) {
      // Safe fallback
    }

    try {
      navigator.vibrate?.([120, 40, 260]);
    } catch (_) {
      // Ignore browsers blocking vibration without gesture
    }

    updateEntityDistance(state.progress);
    updateClimaxTaunt(state.progress, state.act);
    updateScenePreview(state.activeScene);
    syncDocumentTitle(state.progress, state.act);
  }

  function forceInstantScrollTopZero() {
    const rootEl = document.documentElement;
    const bodyEl = document.body;
    const prevRootBehavior = rootEl ? rootEl.style.scrollBehavior || '' : '';
    const prevBodyBehavior = bodyEl ? bodyEl.style.scrollBehavior || '' : '';

    if (rootEl) rootEl.style.scrollBehavior = 'auto';
    if (bodyEl) bodyEl.style.scrollBehavior = 'auto';

    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } catch (_) {
      window.scrollTo(0, 0);
    }

    if (rootEl) rootEl.scrollTop = 0;
    if (bodyEl) bodyEl.scrollTop = 0;

    window.requestAnimationFrame(() => {
      if (rootEl) rootEl.style.scrollBehavior = prevRootBehavior;
      if (bodyEl) bodyEl.style.scrollBehavior = prevBodyBehavior;
    });
  }

  function resetSanity() {
    state.isResettingSanity = true;
    if (state.resetFallbackTimer) {
      window.clearTimeout(state.resetFallbackTimer);
      state.resetFallbackTimer = 0;
    }

    if (dom.root) {
      dom.root.dataset.climaxFired = 'false';
      dom.root.removeAttribute('data-scarred');
      dom.root.dataset.currentAct = '1';
      dom.root.style.setProperty('--scroll-progress', '0.0000');
      dom.root.style.setProperty('--corruption', '0');
      dom.root.style.setProperty('--dread', '0');
    }
    if (document.body) {
      document.body.dataset.currentAct = '1';
    }

    if (dom.jumpscareOverlay) {
      dom.jumpscareOverlay.classList.remove('active');
      dom.jumpscareOverlay.setAttribute('aria-hidden', 'true');
    }

    try {
      window.NestFX?.reset?.();
    } catch (_) {
      // Safe fallback
    }

    try {
      window.NestAudio?.reset?.();
    } catch (_) {
      // Safe fallback
    }

    // Restore Act 4 streaming log & FAQ state
    state.streamedLogCount = 0;
    if (dom.systemLog) {
      dom.systemLog.textContent = state.initialSystemLog;
      dom.systemLog.scrollTop = 0;
    }

    state.autoOpenedFirstFaq = false;
    for (let i = 0; i < dom.faqItems.length; i += 1) {
      setFaqItemOpen(dom.faqItems[i], false);
    }

    // Restore Act 3 disarm & pricing states
    state.disarmClicks = 0;
    if (dom.disarmBtn && state.initialDisarmLabel) {
      dom.disarmBtn.textContent = state.initialDisarmLabel;
      dom.disarmBtn.classList.remove('is-glitching');
    }
    if (dom.disarmFeedback) {
      dom.disarmFeedback.textContent = '';
      dom.disarmFeedback.classList.remove('visible', 'is-glitching');
    }

    for (let i = 0; i < dom.pricingBtns.length; i += 1) {
      const btn = dom.pricingBtns[i];
      const meta = pricingMetaMap.get(btn);
      if (meta) {
        meta.clicks = 0;
        btn.textContent = meta.originalText;
        btn.classList.remove('is-bound', 'is-glitching');
        if (meta.noteEl) {
          meta.noteEl.textContent = '';
          meta.noteEl.hidden = true;
        }
      }
    }

    // Restore Act 1 scene copy, navbar copy, title, and timers
    state.pageEnterTime = Date.now();
    state.progress = 0;
    state.act = 1;
    state.velocity = 0;

    syncTextStageForProgress(0, 1, true);
    updateScenePreview('morning');
    updateEntityDistance(0);
    syncAudioButtonUI();
    if (state.initialTitle) {
      document.title = state.initialTitle;
    }

    if (prefersReducedMotion()) {
      forceInstantScrollTopZero();
      state.isResettingSanity = false;
      state.lastScrollY = 0;
      performScrollUpdate(true);
      return;
    }

    try {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
    } catch (_) {
      forceInstantScrollTopZero();
    }

    state.resetFallbackTimer = window.setTimeout(() => {
      state.resetFallbackTimer = 0;
      forceInstantScrollTopZero();
      state.isResettingSanity = false;
      state.lastScrollY = 0;
      performScrollUpdate(true);
    }, 650);
  }

  function performScrollUpdate(forceSync) {
    state.scrollRafId = 0;
    if (!dom.root) return;

    const now = performance.now();
    const { scrollTop, progress } = getScrollMetrics();

    if (state.isResettingSanity) {
      dom.root.style.setProperty('--scroll-progress', progress.toFixed(4));
      if (scrollTop <= 4) {
        state.isResettingSanity = false;
        if (state.resetFallbackTimer) {
          window.clearTimeout(state.resetFallbackTimer);
          state.resetFallbackTimer = 0;
        }
      } else {
        state.lastScrollY = scrollTop;
        state.lastScrollSampleTime = now;
        return;
      }
    }

    const dt = Math.max(8, now - (state.lastScrollSampleTime || now));
    const dy = scrollTop - state.lastScrollY;
    const rawVel = Math.abs(dy) / dt; // px per ms
    const instantVelocity = rawVel < 0.35 ? 0 : rawVel;
    state.velocity = forceSync ? 0 : state.velocity * 0.35 + instantVelocity * 0.65;
    if (state.velocity < 0.02) state.velocity = 0;

    state.lastScrollY = scrollTop;
    state.lastScrollSampleTime = now;

    const prevAct = state.act;
    const act = resolveCurrentAct(progress, scrollTop);
    const act5Runway = getAct5RunwayProgress();
    const corruption = computeCorruption(
      act >= 4 ? Math.max(progress, 0.68) : act === 3 ? Math.max(progress, 0.44) : progress
    );
    const dread = computeDread(act >= 5 ? Math.max(progress, 0.88 + act5Runway * 0.12) : progress);

    state.progress = progress;
    state.act = act;

    dom.root.dataset.currentAct = String(act);
    if (document.body) {
      document.body.dataset.currentAct = String(act);
    }

    dom.root.style.setProperty('--scroll-progress', progress.toFixed(4));
    dom.root.style.setProperty('--corruption', corruption === 0 ? '0' : corruption.toFixed(4));
    dom.root.style.setProperty('--dread', dread === 0 ? '0' : dread.toFixed(4));

    const fxProgress =
      act >= 4
        ? Math.max(progress, 0.68)
        : act === 3
          ? Math.max(progress, 0.44)
          : act === 2
            ? Math.max(progress, 0.22)
            : progress;

    try {
      window.NestFX?.setProgress?.(fxProgress, act, state.velocity);
    } catch (_) {
      // Safe guard
    }

    try {
      window.NestAudio?.setProgress?.(fxProgress, act);
    } catch (_) {
      // Safe guard
    }

    syncTextStageForProgress(progress, act, Boolean(forceSync));
    syncDocumentTitle(progress, act);
    syncLocalFlashlightCoords(state.lastFlashX || state.pointerX, state.lastFlashY || state.pointerY);

    if (prevAct !== act) {
      syncAudioButtonUI();
      if (act === 1 && isScarred()) {
        updateScenePreview(state.activeScene);
      }
    }

    if (act === 2 || (progress >= 0.16 && progress <= 0.5)) {
      updateUncannyEyes(state.pointerX, state.pointerY);
    }

    updateEntityDistance(fxProgress);
    updateAct4LogsAndFaq(progress, act);
    updateClimaxTaunt(progress, act);

    if ((progress >= 0.94 || (act === 5 && act5Runway >= 0.55)) && !isClimaxFired()) {
      triggerClimaxSequence();
    }

    ensureDriftLoopState();
  }

  function scheduleScrollUpdate() {
    state.isScrolling = true;
    if (state.scrollIdleTimer) {
      window.clearTimeout(state.scrollIdleTimer);
    }
    state.scrollIdleTimer = window.setTimeout(() => {
      state.isScrolling = false;
      state.velocity = 0;
      try {
        window.NestFX?.setProgress?.(state.progress, state.act, 0);
      } catch (_) {
        // Safe guard
      }
      // Subtle uncanny peripheral glitch right when scrolling pauses in Act 2
      if (state.act === 2 && !state.isResettingSanity) {
        triggerPeripheralPauseGlitch();
      }
    }, 220);

    if (!state.scrollRafId) {
      state.scrollRafId = window.requestAnimationFrame(() => performScrollUpdate(false));
    }
  }

  function triggerPeripheralPauseGlitch() {
    if (!dom.mutableTexts.length || prefersReducedMotion()) return;
    const candidates = dom.mutableTexts.filter((el) => {
      const meta = textMetaMap.get(el);
      return meta && meta.peripheral;
    });
    const pool = candidates.length ? candidates : dom.mutableTexts;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    triggerTransientFlicker(picked, 'uncanny');
  }

  function handlePointerInput(clientX, clientY) {
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
    state.pointerX = clientX;
    state.pointerY = clientY;
    state.lastPointerMoveTime = performance.now();

    if (!state.pointerRafId) {
      state.pointerRafId = window.requestAnimationFrame(() => {
        state.pointerRafId = 0;
        applyFlashCoordinates(state.pointerX, state.pointerY);
        if (state.progress >= 0.15 && state.progress <= 0.52) {
          updateUncannyEyes(state.pointerX, state.pointerY);
        }
      });
    }
  }

  function computeAutonomousDriftPoint(nowMs) {
    const vw = Math.max(window.innerWidth || 1440, 320);
    const vh = Math.max(window.innerHeight || 900, 320);
    const t = nowMs * 0.001;

    // If flashlight stage & wall scratches are visible in Act 4, gently sweep near scratches
    if (dom.flashlightStage && (state.act === 4 || (state.progress >= 0.58 && state.progress <= 0.90))) {
      const stageRect = dom.flashlightStage.getBoundingClientRect();
      if (stageRect.bottom > 40 && stageRect.top < vh - 40 && stageRect.width > 0) {
        if (dom.wallScratches.length > 0) {
          const cycleDuration = 3.6;
          const totalPhase = t / cycleDuration;
          const idxA = Math.floor(totalPhase) % dom.wallScratches.length;
          const idxB = (idxA + 1) % dom.wallScratches.length;
          const mix = totalPhase - Math.floor(totalPhase);
          const smoothMix = mix * mix * (3 - 2 * mix);

          const rectA = dom.wallScratches[idxA].getBoundingClientRect();
          const rectB = dom.wallScratches[idxB].getBoundingClientRect();
          const ax = rectA.left + rectA.width * 0.5;
          const ay = rectA.top + rectA.height * 0.5;
          const bx = rectB.left + rectB.width * 0.5;
          const by = rectB.top + rectB.height * 0.5;

          const wobbleX = Math.sin(t * 1.9) * 26;
          const wobbleY = Math.cos(t * 1.4) * 18;
          return {
            x: clamp(lerp(ax, bx, smoothMix) + wobbleX, 24, vw - 24),
            y: clamp(lerp(ay, by, smoothMix) + wobbleY, 24, vh - 24)
          };
        }

        const cx = stageRect.left + stageRect.width * (0.5 + 0.33 * Math.sin(t * 0.72));
        const cy = clamp(stageRect.top + stageRect.height * (0.5 + 0.28 * Math.cos(t * 0.53)), 40, vh - 40);
        return { x: clamp(cx, 24, vw - 24), y: cy };
      }
    }

    const driftX = vw * (0.5 + 0.30 * Math.sin(t * 0.63) + 0.07 * Math.cos(t * 1.51));
    const driftY = vh * (0.48 + 0.24 * Math.cos(t * 0.47) + 0.06 * Math.sin(t * 1.29));
    return { x: driftX, y: driftY };
  }

  function runDriftLoop(nowMs) {
    state.driftRafId = 0;
    if (document.hidden) return;

    const idleMs = nowMs - state.lastPointerMoveTime;
    const shouldRun = state.progress >= 0.20 || isScarred();
    if (!shouldRun) return;

    if (idleMs > 2500 && nowMs - state.lastDriftFrameTime >= 33) {
      state.lastDriftFrameTime = nowMs;
      const pt = computeAutonomousDriftPoint(nowMs);
      applyFlashCoordinates(pt.x, pt.y);
      if (state.act === 2) {
        updateUncannyEyes(pt.x, pt.y);
      }
    }

    state.driftRafId = window.requestAnimationFrame(runDriftLoop);
  }

  function ensureDriftLoopState() {
    const shouldRun = !document.hidden && (state.progress >= 0.20 || isScarred());
    if (shouldRun && !state.driftRafId) {
      state.driftRafId = window.requestAnimationFrame(runDriftLoop);
    }
  }

  function bindSceneSwitcher() {
    if (!dom.scenePills.length) return;

    const initialActive = dom.scenePills.find((pill) => pill.classList.contains('active'));
    if (initialActive && initialActive.dataset.scene) {
      state.activeScene = initialActive.dataset.scene;
    }

    if (dom.scenePreviewStatus && !dom.scenePreviewStatus.textContent.trim()) {
      updateScenePreview(state.activeScene);
    }

    dom.scenePills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const scene = pill.dataset.scene || 'morning';
        updateScenePreview(scene);
      });
    });
  }

  function bindAct3Controls() {
    if (dom.disarmBtn) {
      state.initialDisarmLabel = dom.disarmBtn.textContent || '强制关闭走廊红外摄像头';
      dom.disarmBtn.addEventListener('click', () => {
        try {
          window.NestAudio?.playGlitch?.(0.7);
        } catch (_) {
          // Safe guard
        }

        const idx = Math.min(state.disarmClicks, DISARM_REFUSALS.length - 1);
        const message = DISARM_REFUSALS[idx];
        state.disarmClicks += 1;

        if (dom.disarmFeedback) {
          dom.disarmFeedback.textContent = message;
          dom.disarmFeedback.classList.add('visible', 'is-glitching');
          window.setTimeout(() => {
            dom.disarmFeedback?.classList.remove('is-glitching');
          }, 280);
        }

        dom.disarmBtn.classList.add('is-glitching');
        if (state.disarmClicks >= 3) {
          dom.disarmBtn.textContent = '手动开关已被内部锁死';
        }
        window.setTimeout(() => {
          dom.disarmBtn?.classList.remove('is-glitching');
        }, 260);
      });
    }

    dom.pricingBtns.forEach((btn) => {
      pricingMetaMap.set(btn, {
        originalText: btn.textContent || '',
        clicks: 0,
        noteEl: null
      });

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        try {
          window.NestAudio?.playGlitch?.(0.55);
        } catch (_) {
          // Safe guard
        }

        const meta = pricingMetaMap.get(btn);
        const clicks = meta ? meta.clicks : 0;
        if (meta) meta.clicks = clicks + 1;

        btn.textContent =
          clicks === 0
            ? '已绑定您的呼吸特征 · 无法退订'
            : '契约已焊入主卧终端 · 剩余退订次数：0';
        btn.classList.add('is-bound', 'is-glitching');

        if (meta) {
          if (!meta.noteEl && btn.parentElement) {
            const note = document.createElement('p');
            note.className = 'system-feedback pricing-feedback';
            note.setAttribute('aria-live', 'polite');
            note.style.marginTop = '0.55rem';
            note.style.fontSize = '0.78rem';
            note.style.color = '#ef4444';
            btn.insertAdjacentElement('afterend', note);
            meta.noteEl = note;
          }
          if (meta.noteEl) {
            meta.noteEl.hidden = false;
            meta.noteEl.textContent =
              clicks === 0
                ? '● 声纹与夜间心率特征采集完毕，自动续期至永久。'
                : '● 退订请求已被客厅主机驳回：您不需要离开家。';
          }
        }

        window.setTimeout(() => {
          btn.classList.remove('is-glitching');
        }, 260);
      });
    });
  }

  function bindAct4Faq() {
    dom.faqItems.forEach((item) => {
      const button = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');
      const originallyHidden = Boolean(answer && answer.hasAttribute('hidden'));
      const initiallyOpen =
        item.classList.contains('open') ||
        Boolean(button && button.getAttribute('aria-expanded') === 'true');

      faqMetaMap.set(item, { button, answer, originallyHidden });
      setFaqItemOpen(item, initiallyOpen);

      if (button) {
        button.addEventListener('click', () => {
          const isOpen = button.getAttribute('aria-expanded') === 'true' || item.classList.contains('open');
          setFaqItemOpen(item, !isOpen);
          try {
            window.NestAudio?.playGlitch?.(0.4);
          } catch (_) {
            // Safe guard
          }
        });
      }
    });
  }

  function bindAudioControls() {
    if (dom.audioToggle) {
      dom.audioToggle.addEventListener('click', async (e) => {
        e.stopPropagation();
        state.userManuallyToggledAudio = true;
        state.firstUnlockHandled = true;

        try {
          const raw = window.NestAudio?.toggle?.();
          const enabled =
            raw && typeof raw.then === 'function' ? Boolean(await raw) : Boolean(raw);
          state.audioEnabled = enabled;
          if (state.audioEnabled) {
            window.NestAudio?.setProgress?.(state.progress, state.act);
          }
        } catch (_) {
          state.audioEnabled = !state.audioEnabled;
        }

        syncAudioButtonUI();
      });
    }

    document.addEventListener(
      'click',
      async (e) => {
        if (state.firstUnlockHandled || state.userManuallyToggledAudio) return;
        const target = e.target;
        if (target && typeof target.closest === 'function' && target.closest('#audio-toggle')) {
          return;
        }

        state.firstUnlockHandled = true;
        if (state.audioEnabled) return;

        try {
          let raw = false;
          if (typeof window.NestAudio?.unlock === 'function') {
            raw = window.NestAudio.unlock();
          } else if (typeof window.NestAudio?.toggle === 'function') {
            raw = window.NestAudio.toggle();
          }
          const unlocked =
            raw && typeof raw.then === 'function' ? Boolean(await raw) : Boolean(raw);
          if (unlocked) {
            state.audioEnabled = true;
            syncAudioButtonUI();
            window.NestAudio?.setProgress?.(state.progress, state.act);
          }
        } catch (_) {
          // Silently ignore if browser gesture policy blocks audio
        }
      },
      { passive: true }
    );
  }

  function startAmbientSecondTicker() {
    updateLiveClock();
    window.setInterval(() => {
      state.tickCount += 1;
      updateLiveClock();

      if (state.act === 5 || state.progress >= 0.84) {
        updateClimaxTaunt(state.progress, state.act);
      }

      if (document.hidden || state.isScrolling || state.isResettingSanity) return;

      // Scarred Act 1: occasional subtle 1-2 character eerie scar flicker
      if (state.act === 1 && isScarred() && state.tickCount % 3 === 0 && dom.mutableTexts.length) {
        const idx = Math.floor(Math.random() * dom.mutableTexts.length);
        triggerTransientFlicker(dom.mutableTexts[idx], 'scar');
      }

      // Paused in Act 2: occasional uncanny peripheral flicker
      if (state.act === 2 && state.tickCount % 3 === 1) {
        triggerPeripheralPauseGlitch();
      }

      // Act 3-5: occasional subtle CSS .is-glitching tremor on corrupted/horror nav items
      if (state.act >= 3 && !prefersReducedMotion() && state.tickCount % 2 === 0 && dom.mutableTexts.length) {
        const el = dom.mutableTexts[Math.floor(Math.random() * dom.mutableTexts.length)];
        const meta = textMetaMap.get(el);
        if (el && meta && !meta.timerId) {
          el.classList.add('is-glitching');
          window.setTimeout(() => {
            el.classList.remove('is-glitching');
          }, 210);
        }
      }
    }, 1000);
  }

  function collectDomReferences() {
    dom.root = document.documentElement;
    dom.actSections = [1, 2, 3, 4, 5]
      .map(
        (n) =>
          document.getElementById(`act-${n}`) ||
          document.querySelector(`.act-section[data-act="${n}"]`)
      )
      .filter(Boolean);
    dom.act4 =
      document.getElementById('act-4') || document.querySelector('.act-section[data-act="4"]');
    dom.act5 =
      document.getElementById('act-5') || document.querySelector('.act-section[data-act="5"]');
    dom.audioToggle = document.getElementById('audio-toggle');
    dom.scenePills = Array.from(document.querySelectorAll('.scene-pill'));
    dom.scenePreviewStatus = document.getElementById('scene-preview-status');
    dom.uncannyEyes = Array.from(document.querySelectorAll('.uncanny-eye'));
    dom.uncannyAvatars = Array.from(document.querySelectorAll('.uncanny-avatar'));
    dom.liveClock = document.getElementById('live-clock');
    dom.entityDistance = document.getElementById('entity-distance');
    dom.disarmBtn = document.getElementById('disarm-btn');
    dom.disarmFeedback = document.getElementById('disarm-feedback');
    dom.pricingBtns = Array.from(document.querySelectorAll('.pricing-btn'));
    dom.faqItems = Array.from(document.querySelectorAll('.faq-item'));
    dom.systemLog = document.getElementById('system-log');
    dom.flashlightStage = document.querySelector('.flashlight-stage');
    dom.wallScratches = Array.from(document.querySelectorAll('.wall-scratch'));
    dom.climaxTaunt = document.getElementById('climax-taunt');
    dom.jumpscareOverlay = document.getElementById('jumpscare-overlay');
    dom.resetSanityBtn = document.getElementById('reset-sanity-btn');
    dom.mutableTexts = Array.from(document.querySelectorAll('[data-normal-text]'));

    dom.mutableTexts.forEach((el) => {
      const normal = el.getAttribute('data-normal-text') ?? el.textContent ?? '';
      const corrupt = el.getAttribute('data-corrupt-text') ?? normal;
      const horror = el.getAttribute('data-horror-text') ?? corrupt;
      const peripheral =
        el.classList.contains('nav-link') ||
        el.id === 'nav-cta' ||
        !el.closest('#act-1');
      textMetaMap.set(el, {
        normal,
        corrupt,
        horror,
        peripheral,
        timerId: 0,
        revertTimerId: 0
      });
    });

    if (dom.systemLog) {
      state.initialSystemLog = dom.systemLog.textContent || '';
    }
  }

  function init() {
    if (state.initialized) return;
    state.initialized = true;

    state.pageEnterTime = Date.now();
    state.initialTitle = document.title || '归巢 NestMind — 新一代全屋主动式 AI 伴侣系统';
    state.pointerX = (window.innerWidth || 1440) * 0.5;
    state.pointerY = (window.innerHeight || 900) * 0.5;
    state.lastScrollSampleTime = performance.now();

    collectDomReferences();

    if (dom.root) {
      if (!dom.root.dataset.climaxFired) {
        dom.root.dataset.climaxFired = 'false';
      }
      state.audioEnabled = dom.root.dataset.audioEnabled === 'true';
    }

    if (dom.jumpscareOverlay) {
      dom.jumpscareOverlay.style.pointerEvents = 'none';
    }

    bindSceneSwitcher();
    bindAct3Controls();
    bindAct4Faq();
    bindAudioControls();

    if (dom.resetSanityBtn) {
      dom.resetSanityBtn.addEventListener('click', (e) => {
        e.preventDefault();
        resetSanity();
      });
    }

    // Pointer tracking across mouse, pointer, and touch
    window.addEventListener(
      'pointermove',
      (e) => handlePointerInput(e.clientX, e.clientY),
      { passive: true }
    );
    window.addEventListener(
      'mousemove',
      (e) => handlePointerInput(e.clientX, e.clientY),
      { passive: true }
    );
    window.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches && e.touches.length > 0) {
          handlePointerInput(e.touches[0].clientX, e.touches[0].clientY);
        }
      },
      { passive: true }
    );

    window.addEventListener('scroll', scheduleScrollUpdate, { passive: true });
    window.addEventListener('resize', () => performScrollUpdate(false), { passive: true });
    window.addEventListener('load', () => performScrollUpdate(true), { once: true });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        ensureDriftLoopState();
      }
    });

    if (typeof ResizeObserver === 'function' && document.body) {
      const ro = new ResizeObserver(() => {
        if (!state.scrollRafId) {
          state.scrollRafId = window.requestAnimationFrame(() => performScrollUpdate(false));
        }
      });
      ro.observe(document.body);
    }

    applyFlashCoordinates(state.pointerX, state.pointerY);
    syncAudioButtonUI();
    startAmbientSecondTicker();
    performScrollUpdate(true);
  }

  window.NestDirector = {
    refresh: () => performScrollUpdate(true),
    resetSanity,
    getState: () => ({
      progress: state.progress,
      act: state.act,
      velocity: state.velocity,
      audioEnabled: state.audioEnabled,
      climaxFired: isClimaxFired(),
      scarred: isScarred()
    })
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
