/* app.js - B5 주보 생성기 (네 HTML/CSS ID 기준) */

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'jubbo_form_v1';

function safeText(v) {
  return (v ?? '').toString();
}

function trimOrEmpty(v) {
  return safeText(v).trim();
}

function addInterCharacterSpacing(v) {
  const t = trimOrEmpty(v);
  if (!t) return '';
  return t
    .split(/\s+/)
    .map(word => word.split('').join(' '))
    .join(' ');
}

function setPreviewText(el, value, isPlaceholder) {
  if (!el) return;
  el.textContent = value;
  el.classList.toggle('placeholder-red', Boolean(isPlaceholder));
}

function setLitMidText(id, value, isPlaceholder, useSsn) {
  const el = $(id);
  if (!el) return;
  const spans = el.querySelectorAll('.lit-mid-text');
  if (spans.length >= 2 && el.id === 'pSermonTitleQuoted') {
    const [mainSpan, refSpan] = spans;
    mainSpan.textContent = value;
    mainSpan.classList.toggle('placeholder-red', Boolean(isPlaceholder));
    mainSpan.classList.toggle('font-ssn', Boolean(useSsn));
    const refValue = el.dataset.ref || '';
    refSpan.textContent = refValue;
    refSpan.classList.add('ref-line');
    return;
  }

  el.innerHTML = '';
  const span = document.createElement('span');
  span.className = 'lit-mid-text';
  span.textContent = value;
  span.classList.toggle('placeholder-red', Boolean(isPlaceholder));
  span.classList.toggle('font-ssn', Boolean(useSsn));
  el.appendChild(span);
}

let adsSwapState = {
  initialized: false,
  swapped: false,
  original: new Map(),
  els: null
};

function storeOriginalPosition(el) {
  if (!el || adsSwapState.original.has(el)) return;
  adsSwapState.original.set(el, { parent: el.parentNode, next: el.nextSibling });
}

function restoreOriginalPosition(el) {
  const pos = adsSwapState.original.get(el);
  if (!pos || !pos.parent) return;
  pos.parent.insertBefore(el, pos.next);
}

function setupAdsSwap() {
  const adsTitle = $('adsTitle');
  const adsPrimary = $('adsPrimary');
  const qrWrap = $('qrWrap');
  const adsOverflowWrap = $('adsOverflowWrap');
  const memoBlock = $('memoBlock');
  const adsPage = document.querySelector('#sheetOuter .ads-page');
  const memoPage = document.querySelector('#sheetInner .memo-page');
  if (!adsTitle || !adsPrimary || !adsOverflowWrap || !memoBlock || !adsPage || !memoPage) return;

  [adsTitle, adsPrimary, qrWrap, adsOverflowWrap, memoBlock].forEach(storeOriginalPosition);
  adsSwapState.els = { adsTitle, adsPrimary, qrWrap, adsOverflowWrap, memoBlock, adsPage, memoPage };
  adsSwapState.initialized = true;
}

function applyAdsSwap(shouldSwap) {
  if (!adsSwapState.initialized || !adsSwapState.els) return;
  if (adsSwapState.swapped === shouldSwap) return;

  const { adsTitle, adsPrimary, qrWrap, adsOverflowWrap, memoBlock, adsPage, memoPage } = adsSwapState.els;

  if (shouldSwap) {
    if (qrWrap) memoPage.insertBefore(qrWrap, memoPage.firstChild);
    memoPage.insertBefore(adsTitle, memoPage.firstChild);
    memoPage.insertBefore(adsPrimary, adsTitle.nextSibling);
    adsPage.insertBefore(adsOverflowWrap, adsPage.firstChild);
    adsPage.appendChild(memoBlock);
    adsPage.classList.add('is-swapped');
    memoPage.classList.add('is-swapped');
  } else {
    [adsTitle, adsPrimary, qrWrap, adsOverflowWrap, memoBlock].forEach(restoreOriginalPosition);
    adsPage.classList.remove('is-swapped');
    memoPage.classList.remove('is-swapped');
  }

  adsSwapState.swapped = shouldSwap;
}

function updateAdsSwapLayout(isSwapped) {
  const adsOverflowWrap = $('adsOverflowWrap');
  const adsOverflow = $('adsOverflow');
  const memoBlock = $('memoBlock');
  const adsPage = document.querySelector('#sheetOuter .ads-page');
  if (!adsOverflowWrap || !adsOverflow || !memoBlock || !adsPage) return;

  adsOverflowWrap.style.maxHeight = '';
  adsOverflow.style.maxHeight = '';
  if (!isSwapped) return;

  const prevFlex = memoBlock.style.flex;
  memoBlock.style.flex = '0 0 auto';
  const memoMin = memoBlock.offsetHeight || 0;
  memoBlock.style.flex = prevFlex || '';

  const styles = getComputedStyle(adsPage);
  const gapPx = parseFloat(styles.rowGap || styles.gap || '0') || 0;
  const max = Math.max(0, adsPage.clientHeight - memoMin - gapPx);
  adsOverflowWrap.style.maxHeight = `${max}px`;
  adsOverflow.style.maxHeight = `${max}px`;
}

function updateAdsPrimaryLayout(isSwapped) {
  const primary = $('adsPrimary');
  const adsTitle = $('adsTitle');
  const adsPage = isSwapped
    ? document.querySelector('#sheetInner .memo-page')
    : document.querySelector('#sheetOuter .ads-page');
  if (!primary || !adsPage) return;

  const styles = getComputedStyle(adsPage);
  const paddingTop = parseFloat(styles.paddingTop || '0') || 0;
  const paddingBottom = parseFloat(styles.paddingBottom || '0') || 0;
  const gapPx = parseFloat(styles.rowGap || styles.gap || '0') || 0;
  const titleH = adsTitle?.offsetHeight || 0;
  const max = Math.max(0, adsPage.clientHeight - paddingTop - paddingBottom - gapPx - titleH);

  primary.style.maxHeight = `${max}px`;
  primary.style.overflow = 'hidden';
}

function getLines(text) {
  return safeText(text)
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

function buildVerseBody(el, text) {
  if (!el) return;
  el.innerHTML = '';
  const lines = safeText(text).split('\n');
  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) {
      const spacer = document.createElement('span');
      spacer.className = 'verse-line';
      spacer.innerHTML = '&nbsp;';
      el.appendChild(spacer);
      return;
    }
    const m = line.match(/^(\d+)\s+(.*)$/);
    const lineEl = document.createElement('span');
    lineEl.className = 'verse-line';
    if (m) {
      lineEl.classList.add('verse-numbered');
      const num = document.createElement('span');
      num.className = 'verse-num';
      const sup = document.createElement('sup');
      sup.className = 'verse-sup';
      sup.textContent = m[1];
      num.appendChild(sup);

      const text = document.createElement('span');
      text.className = 'verse-text';
      text.textContent = m[2];

      lineEl.appendChild(num);
      lineEl.appendChild(text);
    } else {
      lineEl.appendChild(document.createTextNode(line));
    }
    el.appendChild(lineEl);
  });
}

function setDefaultAdEditable(item, isEditable) {
  if (!item || item.dataset.default !== '1') return;
  const editable = Boolean(isEditable);
  item.classList.toggle('is-locked', !editable);

  const titleInput = item.querySelector('.ad-title');
  const bodyInput = item.querySelector('.ad-body');
  [titleInput, bodyInput].forEach((input) => {
    if (!input) return;
    input.readOnly = !editable;
    input.setAttribute('draggable', editable ? 'true' : 'false');
  });

  const toggleBtn = item.querySelector('.ad-edit-toggle');
  if (toggleBtn) {
    toggleBtn.textContent = editable ? '완료' : '수정';
    toggleBtn.setAttribute('aria-pressed', String(editable));
  }
}

function createAdInputElement({ label, title = '', body = '', isDefault = false }) {
  const el = document.createElement('div');
  el.className = 'ad-item';
  el.dataset.default = isDefault ? '1' : '0';
  el.setAttribute('draggable', isDefault ? 'false' : 'true');

  const editButton = isDefault
    ? '<button type="button" class="ad-edit-toggle" aria-pressed="false">수정</button>'
    : '';

  el.innerHTML = `
    <div class="ad-head">
      <strong>${label}</strong>
      <div class="ad-actions">
        ${editButton}
        <button type="button" class="ad-remove" aria-label="삭제">×</button>
      </div>
    </div>
    <div>
      <label>제목</label>
      <input type="text" class="ad-title" value="${title}" placeholder="" />
    </div>
    <div>
      <label>내용</label>
      <textarea class="ad-body" placeholder="">${body}</textarea>
    </div>
  `;

  if (isDefault) {
    setDefaultAdEditable(el, false);
  }

  return el;
}

function updateAdLabels() {
  const varItems = [...document.querySelectorAll('#adInputsVar .ad-item')];
  const defaultItems = [...document.querySelectorAll('#adInputsDefault .ad-item')];

  varItems.forEach((item, idx) => {
    const titleEl = item.querySelector('.ad-head strong');
    if (titleEl) titleEl.textContent = `광고 ${idx + 1}`;
  });

  defaultItems.forEach((item) => {
    const titleEl = item.querySelector('.ad-head strong');
    const name = trimOrEmpty(item.querySelector('.ad-title')?.value);
    if (titleEl) titleEl.textContent = name || '기본광고';
  });
}

/** -----------------------------
 *  입력 UI 자동 생성
 *  - 광고 1~12 (제목/내용)
 *  - 나눔 1~4
 * ----------------------------- */
function buildInputs() {
  const adWrap = $('adInputs');
  const adWrapVar = $('adInputsVar');
  const adWrapDefault = $('adInputsDefault');
  const shareWrap = $('shareInputs');
  const shareWrapVar = $('shareInputsVar');

  if (!adWrap || !adWrapVar || !adWrapDefault || !shareWrap || !shareWrapVar) return;

  function appendDefaultAds() {
    adWrapDefault.appendChild(createAdInputElement({
      label: '광고',
      title: '새가족 안내',
      body: '새가족 등록을 원하시는 분은 예배 후 2층 로비에서 처음마을 리더(임현경)에게 문의',
      isDefault: true
    }));
    adWrapDefault.appendChild(createAdInputElement({
      label: '광고',
      title: '온라인 헌금 안내',
      body: `- 청년부 온라인 헌금 계좌 : 신한 100-034-286804
- 예금주 : 꿈꾸는교회 박종철
- 이체 시 '성명 + 생년월일 + 헌금 종류'로 표기 (예. 김꿈청900301십)`,
      isDefault: true
    }));
  }

  // 가변 광고 기본 1개
  adWrapVar.appendChild(createAdInputElement({ label: '광고 1' }));

  // 기본 광고 2개(항상 마지막)
  appendDefaultAds();
  updateAdLabels();

  function createShareInput(label) {
    const el = document.createElement('div');
    el.className = 'share-item-input';
    el.innerHTML = `
      <div class="ad-head">
        <strong>${label}</strong>
        <button type="button" class="share-remove" aria-label="삭제">×</button>
      </div>
      <div>
        <textarea class="share-q" placeholder=""></textarea>
      </div>
    `;
    return el;
  }

  function updateShareLabels() {
    const items = [...document.querySelectorAll('#shareInputsVar .share-item-input')];
    items.forEach((item, idx) => {
      const titleEl = item.querySelector('.ad-head strong');
      if (titleEl) titleEl.textContent = `나눔 ${idx + 1}`;
    });
  }

  // 기본 없음, 최초 1개 생성
  shareWrapVar.appendChild(createShareInput('나눔 1'));
  updateShareLabels();
}

/** -----------------------------
 * 광고 블록 DOM 생성
 * - 제목: "n. 제목" 굵게
 * - 내용: 각 줄을 span.ads-line로 생성
 *   (CSS에서 .ads-line::before 로 "- " 붙음)
 * ----------------------------- */
function buildAdBlock(index, title, body) {
  const t = trimOrEmpty(title);
  const lines = getLines(body);

  if (!t && lines.length === 0) return null;

  const block = document.createElement('div');
  block.className = 'ads-block';

  const titleNumEl = document.createElement('span');
  titleNumEl.className = 'ads-block-num';
  titleNumEl.textContent = `${index}.`;

  const titleTextEl = document.createElement('span');
  titleTextEl.className = 'ads-block-title';
  titleTextEl.textContent = t || '(제목 없음)';

  const linesEl = document.createElement('div');
  linesEl.className = 'ads-lines';

  lines.forEach((ln) => {
    const span = document.createElement('span');
    span.className = 'ads-line';
    span.textContent = ln;
    linesEl.appendChild(span);
  });

  block.appendChild(titleNumEl);
  block.appendChild(titleTextEl);
  block.appendChild(linesEl);

  return block;
}

/** -----------------------------
 * 광고 overflow 분배
 * - 1페이지 왼쪽(adsPrimary)에 최대한 채움
 * - 넘치는 블록부터 2페이지 오른쪽 memo 아래(adsOverflow)로 이동
 * ----------------------------- */
function distributeAds(blocks) {
  const primary = $('adsPrimary');
  const overflow = $('adsOverflow');
  const warning = $('overflowWarning');
  const overflowWrap = $('adsOverflowWrap');
  const adsMany = $('btnAdsMany')?.classList.contains('is-on') ?? false;

  if (!primary || !overflow) return;

  primary.innerHTML = '';
  overflow.innerHTML = '';
  if (warning) warning.classList.add('hidden');
  if (overflowWrap) overflowWrap.classList.remove('is-active');

  if (!adsMany) {
    // 1페이지(겉면 좌)에 먼저 채움
    const fragAll = document.createDocumentFragment();
    blocks.forEach((b) => fragAll.appendChild(b));
    primary.appendChild(fragAll);

    // 다 들어가면 종료
    if (primary.scrollHeight <= primary.clientHeight + 1) return;

    // 넘치면: 2페이지(속면 우)에서 시작하고 남은 것이 1페이지(겉면 좌)로 이어짐
    const cloned = blocks.map((b) => b.cloneNode(true));
    primary.innerHTML = '';
    overflow.innerHTML = '';

    if (overflowWrap) overflowWrap.classList.add('is-active');

    const overflowFrag = document.createDocumentFragment();
    const primaryFrag = document.createDocumentFragment();

    for (let i = 0; i < cloned.length; i++) {
      overflow.appendChild(cloned[i]);
      if (overflow.scrollHeight > overflow.clientHeight + 1) {
        overflow.removeChild(cloned[i]);
        for (let j = i; j < cloned.length; j++) {
          primaryFrag.appendChild(cloned[j]);
        }
        break;
      }
    }

    const overflowItems = [...overflow.childNodes];
    overflow.innerHTML = '';
    overflowItems.forEach((n) => overflowFrag.appendChild(n));
    overflow.appendChild(overflowFrag);
    primary.appendChild(primaryFrag);
  } else {
    // 광고 많음: 2페이지 우(adsPrimary)에 먼저 채움
    const fragAll = document.createDocumentFragment();
    blocks.forEach((b) => fragAll.appendChild(b));
    primary.appendChild(fragAll);

    // 다 들어가면 종료
    if (primary.scrollHeight <= primary.clientHeight + 1) return;

    // 넘치면: 1페이지 좌(adsOverflow)로 이어짐
    const cloned = blocks.map((b) => b.cloneNode(true));
    primary.innerHTML = '';
    overflow.innerHTML = '';

    if (overflowWrap) overflowWrap.classList.add('is-active');

    const primaryFrag = document.createDocumentFragment();
    const overflowFrag = document.createDocumentFragment();

    for (let i = 0; i < cloned.length; i++) {
      primary.appendChild(cloned[i]);
      if (primary.scrollHeight > primary.clientHeight + 1) {
        primary.removeChild(cloned[i]);
        for (let j = i; j < cloned.length; j++) {
          overflowFrag.appendChild(cloned[j]);
        }
        break;
      }
    }

    const primaryItems = [...primary.childNodes];
    primary.innerHTML = '';
    primaryItems.forEach((n) => primaryFrag.appendChild(n));
    primary.appendChild(primaryFrag);
    overflow.appendChild(overflowFrag);
  }

  // 1페이지에도 더 넘치면 경고
  if (warning && primary.scrollHeight > primary.clientHeight + 1) {
    warning.classList.remove('hidden');
  }

  // overflow 영역도 넘치면 경고(3페이지/자동축소는 다음 단계)
  if (warning && overflow.scrollHeight > overflow.clientHeight + 1) {
    warning.classList.remove('hidden');
  }
}

/** -----------------------------
 * 미리보기 렌더
 * ----------------------------- */
function render() {
  try {
  // 입력값
  const date = trimOrEmpty($('inDate')?.value) || '2026년 0월 00일';
  const sermonTitle = trimOrEmpty($('inSermonTitle')?.value);
  const headerVerse = safeText($('inHeaderVerse')?.value || ''); // 공란 가능
  const sermonBody = safeText($('inSermonBody')?.value || '');
  const sermonRef = trimOrEmpty($('inSermonRef')?.value);

  const rawPrayerLeader = trimOrEmpty($('inPrayerLeader')?.value);
  const rawOfferingLeader = trimOrEmpty($('inOfferingLeader')?.value);
  const rawAdLeader = trimOrEmpty($('inAdLeader')?.value);
  const rawSermonPreacher = trimOrEmpty($('inSermonPreacher')?.value);
  const rawBenediction = trimOrEmpty($('inBenediction')?.value);
  const showQr = $('btnShowQr')?.classList.contains('is-on') ?? false;
  const adsMany = $('btnAdsMany')?.classList.contains('is-on') ?? false;

  const prayerLeader = rawPrayerLeader || '(대표기도)';
  const offeringLeader = rawOfferingLeader || '다같이';
  const adLeader = rawAdLeader || '(광고)';
  const sermonPreacher = rawSermonPreacher || '(말씀선포)';
  const benediction = rawBenediction || '(축도)';
  const prayerLeaderSpaced = addInterCharacterSpacing(prayerLeader);
  const offeringLeaderSpaced = rawOfferingLeader
    ? addInterCharacterSpacing(offeringLeader)
    : offeringLeader;
  const adLeaderSpaced = addInterCharacterSpacing(adLeader);
  const sermonPreacherSpaced = addInterCharacterSpacing(sermonPreacher);
  const benedictionSpaced = addInterCharacterSpacing(benediction);

  const praiseLines = getLines($('inPraise')?.value || '').join('\n'); // 여러 줄
  const responsePraiseLines = getLines($('inResponsePraise')?.value || '').join('\n');

  // 표지(겉면 우)
  if ($('pDate')) $('pDate').textContent = date;
  if ($('pHeaderVerse')) $('pHeaderVerse').textContent = headerVerse;

  setLitMidText(
    'pPraise',
    praiseLines || '(찬양 콘티 기입)',
    !praiseLines,
    !praiseLines
  );
  setLitMidText('pResponsePraise', responsePraiseLines, false, false);

  setPreviewText($('pPrayerLeader'), prayerLeaderSpaced, !rawPrayerLeader);
  setPreviewText($('pOfferingLeader'), offeringLeaderSpaced, false);
  setPreviewText($('pAdLeader'), adLeaderSpaced, !rawAdLeader);
  setPreviewText($('pSermonPreacher'), sermonPreacherSpaced, !rawSermonPreacher);
  setPreviewText($('pBenediction'), benedictionSpaced, !rawBenediction);

  applyAdsSwap(adsMany);
  updateAdsSwapLayout(adsMany);
  updateAdsPrimaryLayout(adsMany);
  const adsPage = adsMany
    ? document.querySelector('#sheetInner .memo-page')
    : document.querySelector('#sheetOuter .ads-page');
  const outerAdsPage = document.querySelector('#sheetOuter .ads-page');
  const innerMemoPage = document.querySelector('#sheetInner .memo-page');
  const qrWrap = $('qrWrap');
  if (outerAdsPage) outerAdsPage.classList.remove('has-qr');
  if (innerMemoPage) innerMemoPage.classList.remove('has-qr');
  if (adsPage) adsPage.classList.toggle('has-qr', showQr);
  if (qrWrap) qrWrap.classList.toggle('hidden', !showQr);

  // 말씀선포 제목: 기본은 (설교 제목 기입)
  setLitMidText(
    'pSermonTitleQuoted',
    sermonTitle ? `“${sermonTitle}”` : '(설교 제목 기입)',
    !sermonTitle,
    !sermonTitle
  );
  const quotedEl = $('pSermonTitleQuoted');
  if (quotedEl) {
    quotedEl.dataset.ref = sermonRef ? `(${sermonRef})` : '';
    setLitMidText(
      'pSermonTitleQuoted',
      sermonTitle ? `“${sermonTitle}”` : '(설교 제목 기입)',
      !sermonTitle,
      !sermonTitle
    );
  }

  // 2페이지 좌측 상단: 설교제목 = 표지 설교제목 자동 반영
  if ($('pSermonTitle')) {
    $('pSermonTitle').textContent = sermonTitle ? `“${sermonTitle}”` : '“설교제목”';
  }

  // 본문/구절 영역
  if ($('pSermonBody')) {
    const bodyEl = $('pSermonBody');
    buildVerseBody(bodyEl, sermonBody);
    if (sermonRef) {
      const ref = document.createElement('div');
      ref.className = 'verse-ref';
      ref.textContent = `(${sermonRef})`;
      bodyEl.appendChild(ref);
    }
    const isEmpty = !sermonBody.trim() && !sermonRef;
    bodyEl.classList.toggle('is-empty', isEmpty);
  }

  // 나눔 (가변)
  const shareItems = [...document.querySelectorAll('#shareInputsVar .share-item-input')];
  const shareTexts = [];
  shareItems.forEach((item, idx) => {
    const q = trimOrEmpty(item.querySelector('.share-q')?.value);
    shareTexts.push(`나눔 ${idx + 1}.${q ? ` ${q}` : ''}`.trim());
  });
  for (let i = 1; i <= 4; i++) {
    const out = $(`share${i}`);
    if (!out) continue;
    const text = shareTexts[i - 1] || '';
    out.textContent = text;
    out.classList.toggle('is-empty', !text);
  }

  // 광고 블록 생성 (가변 + 기본, 기본은 항상 마지막)
  const adBlocks = [];
  const adItems = [
    ...document.querySelectorAll('#adInputsVar .ad-item'),
    ...document.querySelectorAll('#adInputsDefault .ad-item')
  ];

  adItems.forEach((item, idx) => {
    const t = trimOrEmpty(item.querySelector('.ad-title')?.value);
    const b = safeText(item.querySelector('.ad-body')?.value || '');
    const blk = buildAdBlock(idx + 1, t, b);
    if (blk) adBlocks.push(blk);
  });

  distributeAds(adBlocks);

  // 읽기용: 인쇄 스타일 그대로를 모바일 스택으로 재구성
  const readStack = $('readStack');
  if (readStack) {
    try {
      readStack.innerHTML = '';

      const cloneNode = (node) => node.cloneNode(true);

      const coverPage = document.querySelector('#sheetOuter .cover-page');
      const sharePage = document.querySelector('#sheetInner .share-page');

      if (coverPage) {
        const c = cloneNode(coverPage);
        c.classList.add('read-cover-page');
        readStack.appendChild(c);
      }
      if (sharePage) {
        const s = cloneNode(sharePage);
        s.classList.add('read-share-page');
        readStack.appendChild(s);
      }

      // 광고 전체 리스트(읽기용) — 순서대로 모두 표시
      const adsPage = document.createElement('div');
      adsPage.className = 'panel-page ads-page read-ads read-ads-page';
      const title = document.createElement('div');
      title.className = 'ads-title';
      title.textContent = '광고';
      const list = document.createElement('div');
      list.className = 'ads-list';
      adBlocks.forEach((b) => list.appendChild(b.cloneNode(true)));
      adsPage.appendChild(title);
      adsPage.appendChild(list);
      readStack.appendChild(adsPage);

      if (readStack.childElementCount === 0) {
        const empty = document.createElement('div');
        empty.className = 'read-empty';
        empty.textContent = '읽기 미리보기 내용이 없습니다.';
        readStack.appendChild(empty);
      }
    } catch (err) {
      readStack.innerHTML = '';
      const empty = document.createElement('div');
      empty.className = 'read-empty';
      empty.textContent = `읽기 미리보기 오류: ${err?.message || err}`;
      readStack.appendChild(empty);
    }
  }
  } catch (err) {
    console.error(err);
    const tabRead = $('tabRead');
    if (tabRead) {
      tabRead.style.display = 'block';
      tabRead.innerHTML = '';
      const empty = document.createElement('div');
      empty.className = 'read-empty';
      empty.textContent = `읽기 미리보기 오류: ${err?.message || err}`;
      tabRead.appendChild(empty);
    }
  }
}

/** -----------------------------
 * 탭 전환 / 다운로드 / 인쇄
 * ----------------------------- */
function setupTabs() {
  document.querySelectorAll('.tab').forEach((t) => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
      t.classList.add('active');

      const tab = t.dataset.tab;
      const tabPrint = $('tabPrint');
      const tabRead = $('tabRead');
      if (tabPrint) tabPrint.style.display = (tab === 'print') ? 'block' : 'none';
      if (tabRead) tabRead.style.display = (tab === 'read') ? 'block' : 'none';
      render();
      if (tab === 'read') {
        setTimeout(render, 0);
      }
    });
  });
}

function setupActions() {
  const getDateFilePrefix = () => {
    const dateText = trimOrEmpty($('inDate')?.value) || '날짜';
    return dateText;
  };
  // 인쇄/저장(PDF): 새 탭에서 미리보기
  $('btnPrint')?.addEventListener('click', async () => {
    const { jsPDF } = window.jspdf;
    const outer = $('sheetOuter');
    const inner = $('sheetInner');
    if (!outer || !inner) return;

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [257, 182] });
    const pages = [outer, inner];

    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], { scale: 6, backgroundColor: '#ffffff' });
      const img = canvas.toDataURL('image/png');

      if (i > 0) pdf.addPage([257, 182], 'landscape');
      pdf.addImage(img, 'PNG', 0, 0, 257, 182);
    }

    const fileName = `${getDateFilePrefix()} 꿈청 주보.pdf`;
    pdf.setProperties({ title: fileName });
    const blobUrl = pdf.output('bloburl');
    window.open(blobUrl, '_blank', 'noopener');
  });

  // PNG 다운로드: 활성 탭 기준(인쇄 탭이면 겉면 캡처)
  $('btnPng')?.addEventListener('click', async () => {
    const activeTab = document.querySelector('.tab.active')?.dataset?.tab ?? 'print';
    const target = (activeTab === 'print') ? $('sheetOuter') : $('tabRead');
    if (!target) return;

    const fileName = (activeTab === 'print')
      ? `${getDateFilePrefix()} 주보.png`
      : `${getDateFilePrefix()} 주보(모바일).png`;
    const canvas = await html2canvas(target, { scale: 6, backgroundColor: '#ffffff' });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return;
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
  });

  // PDF 다운로드: 겉면+속면 2페이지를 PDF로
  $('btnPdf')?.addEventListener('click', async () => {
    const { jsPDF } = window.jspdf;
    const outer = $('sheetOuter');
    const inner = $('sheetInner');
    if (!outer || !inner) return;

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [257, 182] });
    const pages = [outer, inner];

    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], { scale: 6, backgroundColor: '#ffffff' });
      const img = canvas.toDataURL('image/png');

      if (i > 0) pdf.addPage([257, 182], 'landscape');
      pdf.addImage(img, 'PNG', 0, 0, 257, 182);
    }
    pdf.save('jubbo_B5_fold_bw.pdf');
  });
}

/** -----------------------------
 * 입력 이벤트 바인딩
 * ----------------------------- */
let raf = null;
function requestRender() {
  if (raf) cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    render();
    raf = null;
  });
}

function setupInputs() {
  const baseIds = [
    'inDate','inDatePicker','inSermonTitle','inHeaderVerse',
    'inPraise','inResponsePraise',
    'inPrayerLeader','inOfferingLeader',
    'inAdLeader',
    'inSermonBody',
    'inSermonRef',
    'inSermonPreacher','inBenediction'
  ];

  baseIds.forEach((id) => $(id)?.addEventListener('input', requestRender));
  baseIds.forEach((id) => $(id)?.addEventListener('input', persistFormState));
  const btnShowQr = $('btnShowQr');
  const btnAdsMany = $('btnAdsMany');
  const btnClearAll = $('btnClearAll');

  btnShowQr?.addEventListener('click', () => {
    btnShowQr.classList.toggle('is-on');
    btnShowQr.setAttribute('aria-pressed', String(btnShowQr.classList.contains('is-on')));
    requestRender();
    persistFormState();
  });

  btnAdsMany?.addEventListener('click', () => {
    btnAdsMany.classList.toggle('is-on');
    btnAdsMany.setAttribute('aria-pressed', String(btnAdsMany.classList.contains('is-on')));
    requestRender();
    persistFormState();
  });

  btnClearAll?.addEventListener('click', () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('clear storage failed', err);
    }
    location.reload();
  });

  const datePicker = $('inDatePicker');
  const dateInput = $('inDate');
  if (datePicker && dateInput) {
    datePicker.addEventListener('change', () => {
      const formatted = formatDateKorean(datePicker.value);
      if (formatted) dateInput.value = formatted;
      requestRender();
      persistFormState();
    });
  }

  for (let i = 1; i <= 12; i++) {
    $(`adTitle${i}`)?.addEventListener('input', requestRender);
    $(`adBody${i}`)?.addEventListener('input', requestRender);
  }

}

function formatDateKorean(iso) {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  const y = m[1];
  const mon = String(parseInt(m[2], 10));
  const d = String(parseInt(m[3], 10));
  return `${y}년 ${mon}월 ${d}일`;
}

function setupAdInputs() {
  const adWrap = $('adInputs');
  const adWrapVar = $('adInputsVar');
  const addBtn = $('btnAddAd');
  if (!adWrap || !adWrapVar || !addBtn) return;
  let draggingItem = null;

  const adsSectionBody = adWrap.closest('.section-body');
  const updateAdsSectionHeight = () => {
    if (!adsSectionBody) return;
    if (adsSectionBody.closest('.form-section')?.classList.contains('is-collapsed')) return;
    adsSectionBody.style.maxHeight = `${adsSectionBody.scrollHeight}px`;
  };
  adWrap.addEventListener('input', (e) => {
    if (e.target?.classList?.contains('ad-title') || e.target?.classList?.contains('ad-body')) {
      requestRender();
      persistFormState();
      updateAdsSectionHeight();
    }
  });

  adWrap.addEventListener('click', (e) => {
    const toggleBtn = e.target?.closest?.('.ad-edit-toggle');
    if (toggleBtn) {
      const item = toggleBtn.closest('.ad-item');
      if (!item || item.dataset.default !== '1') return;
      const willEdit = item.classList.contains('is-locked');
      setDefaultAdEditable(item, willEdit);
      if (!willEdit) {
        requestRender();
        persistFormState();
      }
      return;
    }

    const btn = e.target?.closest?.('.ad-remove');
    if (!btn) return;
    const item = btn.closest('.ad-item');
    if (!item) return;
    const isDefault = item.dataset.default === '1';
    if (isDefault) {
      const title = item.querySelector('.ad-head strong')?.textContent || '기본광고';
      const ok = window.confirm(`${title} 광고를 삭제하시겠습니까?`);
      if (!ok) return;
    }
    item.remove();
    requestRender();
    persistFormState();
    updateAdsSectionHeight();
    updateAdLabels();
  });

  addBtn.addEventListener('click', () => {
    const el = createAdInputElement({ label: '광고' });
    adWrapVar.appendChild(el);
    requestRender();
    persistFormState();
    updateAdsSectionHeight();
    updateAdLabels();
  });

  const getDragAfterElement = (container, y) => {
    const els = [...container.querySelectorAll('.ad-item[data-default="0"]:not(.is-dragging)')];
    return els.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
  };

  adWrapVar.addEventListener('dragstart', (e) => {
    const item = e.target?.closest?.('.ad-item');
    if (!item || item.dataset.default === '1') return;
    if (e.target?.closest?.('input,textarea,button')) {
      e.preventDefault();
      return;
    }
    draggingItem = item;
    item.classList.add('is-dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', 'ad-item');
    }
  });

  adWrapVar.addEventListener('dragover', (e) => {
    if (!draggingItem) return;
    e.preventDefault();
    const afterElement = getDragAfterElement(adWrapVar, e.clientY);
    if (!afterElement) adWrapVar.appendChild(draggingItem);
    else adWrapVar.insertBefore(draggingItem, afterElement);
  });

  adWrapVar.addEventListener('drop', (e) => {
    if (!draggingItem) return;
    e.preventDefault();
  });

  adWrapVar.addEventListener('dragend', () => {
    if (!draggingItem) return;
    draggingItem.classList.remove('is-dragging');
    draggingItem = null;
    updateAdLabels();
    requestRender();
    persistFormState();
    updateAdsSectionHeight();
  });
}

function setupShareInputs() {
  const wrap = $('shareInputs');
  const wrapVar = $('shareInputsVar');
  const addBtn = $('btnAddShare');
  if (!wrap || !wrapVar || !addBtn) return;

  const updateShareLabels = () => {
    const items = [...wrapVar.querySelectorAll('.share-item-input')];
    items.forEach((item, idx) => {
      const titleEl = item.querySelector('.ad-head strong');
      if (titleEl) titleEl.textContent = `나눔 ${idx + 1}`;
    });
  };

  const updateShareSectionHeight = () => {
    const body = wrap.closest('.section-body');
    if (!body) return;
    if (body.closest('.form-section')?.classList.contains('is-collapsed')) return;
    body.style.maxHeight = `${body.scrollHeight}px`;
  };

  const scrollNewShareIntoView = (item) => {
    const target = item.querySelector('.share-q') || item;
    const form = wrap.closest('.form');
    if (!target) return;
    if (!form) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const formRect = form.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const targetTopInForm = form.scrollTop + (targetRect.top - formRect.top);
    const nextTop = Math.max(0, targetTopInForm - form.clientHeight * 0.35);
    form.scrollTo({ top: nextTop, behavior: 'smooth' });
    if (Math.abs(form.scrollTop - nextTop) < 1) {
      form.scrollTop = nextTop;
    }
  };

  wrap.addEventListener('input', (e) => {
    if (e.target?.classList?.contains('share-q')) {
      requestRender();
      persistFormState();
      updateShareSectionHeight();
    }
  });

  wrap.addEventListener('click', (e) => {
    const btn = e.target?.closest?.('.share-remove');
    if (!btn) return;
    const item = btn.closest('.share-item-input');
    if (!item) return;
    item.remove();
    updateShareLabels();
    requestRender();
    persistFormState();
    updateShareSectionHeight();
  });

  addBtn.addEventListener('click', () => {
    const el = document.createElement('div');
    el.className = 'share-item-input';
    el.innerHTML = `
      <div class="ad-head">
        <strong>나눔</strong>
        <button type="button" class="share-remove" aria-label="삭제">×</button>
      </div>
      <div>
        <textarea class="share-q" placeholder=""></textarea>
      </div>
    `;
    wrapVar.appendChild(el);
    updateShareLabels();
    requestRender();
    persistFormState();
    updateShareSectionHeight();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollNewShareIntoView(el);
      });
    });
  });

  updateShareLabels();
}

function getAdInputsState() {
  const items = [
    ...document.querySelectorAll('#adInputsVar .ad-item'),
    ...document.querySelectorAll('#adInputsDefault .ad-item')
  ];
  return items.map((item) => ({
    title: item.querySelector('.ad-title')?.value ?? '',
    body: item.querySelector('.ad-body')?.value ?? '',
    isDefault: item.dataset.default === '1'
  }));
}

function getShareInputsState() {
  const items = [...document.querySelectorAll('#shareInputsVar .share-item-input')];
  return items.map((item) => ({
    q: item.querySelector('.share-q')?.value ?? ''
  }));
}

function persistFormState() {
  try {
    const payload = {
      inDate: $('inDate')?.value ?? '',
      inDatePicker: $('inDatePicker')?.value ?? '',
      inSermonTitle: $('inSermonTitle')?.value ?? '',
      inHeaderVerse: $('inHeaderVerse')?.value ?? '',
      inPraise: $('inPraise')?.value ?? '',
      inResponsePraise: $('inResponsePraise')?.value ?? '',
      inPrayerLeader: $('inPrayerLeader')?.value ?? '',
      inOfferingLeader: $('inOfferingLeader')?.value ?? '',
      inAdLeader: $('inAdLeader')?.value ?? '',
      inSermonBody: $('inSermonBody')?.value ?? '',
      inSermonRef: $('inSermonRef')?.value ?? '',
      inSermonPreacher: $('inSermonPreacher')?.value ?? '',
      inBenediction: $('inBenediction')?.value ?? '',
      inShowQr: $('btnShowQr')?.classList.contains('is-on') ?? false,
      inAdsMany: $('btnAdsMany')?.classList.contains('is-on') ?? false,
      ads: getAdInputsState(),
      shares: getShareInputsState()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('persistFormState failed', err);
  }
}

function restoreFormState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);

    const setVal = (id, v) => {
      const el = $(id);
      if (!el || v == null) return;
      if (el.type === 'checkbox') el.checked = Boolean(v);
      else el.value = v;
    };

    setVal('inDate', data.inDate);
    setVal('inDatePicker', data.inDatePicker);
    setVal('inSermonTitle', data.inSermonTitle);
    setVal('inHeaderVerse', data.inHeaderVerse);
    setVal('inPraise', data.inPraise);
    setVal('inResponsePraise', data.inResponsePraise);
    setVal('inPrayerLeader', data.inPrayerLeader);
    setVal('inOfferingLeader', data.inOfferingLeader);
    setVal('inAdLeader', data.inAdLeader);
    setVal('inSermonBody', data.inSermonBody);
    setVal('inSermonRef', data.inSermonRef);
    setVal('inSermonPreacher', data.inSermonPreacher);
    setVal('inBenediction', data.inBenediction);
    const btnShowQr = $('btnShowQr');
    const btnAdsMany = $('btnAdsMany');
    if (btnShowQr) {
      const show = Boolean(data.inShowQr);
      btnShowQr.classList.toggle('is-on', show);
      btnShowQr.setAttribute('aria-pressed', String(show));
    }
    if (btnAdsMany) {
      btnAdsMany.classList.toggle('is-on', Boolean(data.inAdsMany));
      btnAdsMany.setAttribute('aria-pressed', String(Boolean(data.inAdsMany)));
    }

    if (Array.isArray(data.ads)) {
      const adWrapVar = $('adInputsVar');
      const adWrapDefault = $('adInputsDefault');
      if (adWrapVar) adWrapVar.innerHTML = '';
      if (adWrapDefault) adWrapDefault.innerHTML = '';

      data.ads.forEach((item, idx) => {
        const isDefault = Boolean(item.isDefault);
        const label = isDefault ? '기본광고' : `광고 ${idx + 1}`;
        const el = createAdInputElement({
          label,
          title: item.title ?? '',
          body: item.body ?? '',
          isDefault
        });
        if (isDefault) adWrapDefault?.appendChild(el);
        else adWrapVar?.appendChild(el);
      });
      updateAdLabels();
    }

    if (Array.isArray(data.shares)) {
      const wrapVar = $('shareInputsVar');
      if (wrapVar) wrapVar.innerHTML = '';
      data.shares.forEach((item, idx) => {
        const el = document.createElement('div');
        el.className = 'share-item-input';
        el.innerHTML = `
          <div class="ad-head">
            <strong>나눔 ${idx + 1}</strong>
            <button type="button" class="share-remove" aria-label="삭제">×</button>
          </div>
          <div>
            <textarea class="share-q" placeholder="">${item.q ?? ''}</textarea>
          </div>
        `;
        wrapVar?.appendChild(el);
      });
    }
  } catch (err) {
    console.warn('restoreFormState failed', err);
  }
}

function setupSections() {
  document.querySelectorAll('.section-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const section = btn.closest('.form-section');
      if (!section) return;
      const body = section.querySelector('.section-body');
      if (body) {
        body.style.maxHeight = `${body.scrollHeight}px`;
      }
      const isCollapsed = section.classList.toggle('is-collapsed');
      if (body) {
        if (isCollapsed) {
          requestAnimationFrame(() => {
            body.style.maxHeight = '0px';
          });
        } else {
          requestAnimationFrame(() => {
            body.style.maxHeight = `${body.scrollHeight}px`;
          });
        }
      }
      btn.setAttribute('aria-expanded', String(!isCollapsed));
    });
  });

  document.querySelectorAll('.form-section .section-body').forEach((body) => {
    const section = body.closest('.form-section');
    if (!section) return;
    if (!section.classList.contains('is-collapsed')) {
      body.style.maxHeight = `${body.scrollHeight}px`;
    }
  });
}

function setupSectionBodyAutoResize(sectionSelector) {
  const section = document.querySelector(sectionSelector);
  if (!section) return;
  const body = section.querySelector('.section-body');
  if (!body) return;
  const update = () => {
    if (section.classList.contains('is-collapsed')) return;
    body.style.maxHeight = `${body.scrollHeight}px`;
  };
  body.addEventListener('input', update);
  window.addEventListener('resize', update);
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(update);
    ro.observe(body);
  }
  update();
}

/** -----------------------------
 * 시작
 * ----------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  buildInputs();
  restoreFormState();
  setupAdsSwap();
  setupTabs();
  setupActions();
  setupInputs();
  setupAdInputs();
  setupShareInputs();
  setupSections();
  setupSectionBodyAutoResize('.form-section[data-section="body"]');
  // 초기 탭 상태 정리
  const activeTab = document.querySelector('.tab.active')?.dataset?.tab || 'print';
  const tabPrint = $('tabPrint');
  const tabRead = $('tabRead');
  if (tabPrint) tabPrint.style.display = (activeTab === 'print') ? 'block' : 'none';
  if (tabRead) tabRead.style.display = (activeTab === 'read') ? 'block' : 'none';
  render();

  const modal = $('feedbackModal');
  const btnOpen = $('btnFeedback');
  const btnClose = $('btnFeedbackClose');
  const btnSend = $('btnFeedbackSend');
  const subject = $('feedbackSubject');
  const message = $('feedbackMessage');

  const closeModal = () => {
    if (!modal) return;
    modal.classList.add('hidden');
  };
  const openModal = () => {
    if (!modal) return;
    modal.classList.remove('hidden');
    subject?.focus();
  };

  btnOpen?.addEventListener('click', openModal);
  btnClose?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    const target = e.target;
    if (target?.dataset?.close) closeModal();
  });
  btnSend?.addEventListener('click', () => {
    const title = trimOrEmpty(subject?.value);
    const body = trimOrEmpty(message?.value);
    if (!title && !body) {
      alert('제목 또는 내용을 입력해 주세요.');
      return;
    }
    const mailSubject = encodeURIComponent(title || '주보 피드백');
    const mailBody = encodeURIComponent(body || '');
    const mailto = `mailto:kkumchung1@gmail.com?subject=${mailSubject}&body=${mailBody}`;
    window.location.href = mailto;
    closeModal();
  });
});
