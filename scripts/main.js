const contentInput = document.getElementById("contentInput");
const charCount = document.getElementById("charCount");
const screenStage = document.getElementById("screenStage");
const firstScreen = document.querySelector(".screen-panel-current");
const nextScreen = document.getElementById("nextScreen");
const resultVersionBar = document.getElementById("resultVersionBar");
const showInitialResult = document.getElementById("showInitialResult");
const showLatestResult = document.getElementById("showLatestResult");
const resultVersionStatus = document.getElementById("resultVersionStatus");
const resultMain = document.getElementById("resultMain");
const resultSectionTitle = document.getElementById("resultSectionTitle");
const resultGrid = document.getElementById("resultGrid");
const composerPanel = document.getElementById("composerPanel");
const editorShell = document.getElementById("editorShell");
const emptyBackground = document.getElementById("emptyBackground");
const attachmentState = document.getElementById("attachmentState");
const fileInput = document.getElementById("fileInput");
const modeToggle = document.getElementById("modeToggle");
const startReview = document.getElementById("startReview");
const resultActionDock = document.getElementById("resultActionDock");
const openFollowup = document.getElementById("openFollowup");
const backToFirst = document.getElementById("backToFirst");
const followupOverlay = document.getElementById("followupOverlay");
const closeFollowup = document.getElementById("closeFollowup");
const closeFollowupMask = document.getElementById("closeFollowupMask");
const followupHint = document.getElementById("followupHint");
const followupDescription = document.getElementById("followupDescription");
const followupThread = document.getElementById("followupThread");
const followupInput = document.getElementById("followupInput");
const applyFollowup = document.getElementById("applyFollowup");
const sendFollowup = document.getElementById("sendFollowup");
const magicWandTrack = document.getElementById("magicWandTrack");
const toast = document.getElementById("toast");
const resultSummaryText = document.getElementById("resultSummaryText");
const resultSummaryLoading = document.getElementById("resultSummaryLoading");
const resultTextPolitics = document.getElementById("resultText-politics");
const resultTextQuality = document.getElementById("resultText-quality");
const resultTextLegal = document.getElementById("resultText-legal");
const resultTextSentiment = document.getElementById("resultText-sentiment");

const filesState = [];
const defaultPlaceholder = "请输入或复制您的文案内容，我们将快速进行智能审核";
const allowedExtensions = new Set(["jpg", "png", "pdf", "docx", "doc"]);
const resultReturnWheelThreshold = -120;
const resultReturnTouchThreshold = 110;
const initialFollowupMessage = "首轮审核已完成。如果你认为当前结论不准确、解释不充分，或希望系统结合更多上下文重新判断，可以继续发起复审对话。";
let toastTimer = null;
let hasResultScreen = false;
let currentInputMode = "file";
let touchStartY = 0;
let resultTouchStartY = 0;
let resultTouchStartedAtTop = false;
let resultInteractionLocked = false;
let currentReviewMaterial = "text";
let activeFollowupDimension = "quality";
let activeActionId = "recheck-basis";
let pendingReviewUpdate = false;
let pendingReviewDraft = createEmptyPendingReview();
let resultScreenReady = false;
let resultLoadingTimer = null;
let currentResultVersion = "initial";

const resultTextMap = {
  politics: resultTextPolitics,
  quality: resultTextQuality,
  legal: resultTextLegal,
  sentiment: resultTextSentiment
};

const defaultResultTexts = {
  summary: resultSummaryText?.textContent.trim() || "",
  politics: resultTextPolitics?.textContent.trim() || "",
  quality: resultTextQuality?.textContent.trim() || "",
  legal: resultTextLegal?.textContent.trim() || "",
  sentiment: resultTextSentiment?.textContent.trim() || ""
};

const resultVersions = {
  initial: createInitialResultVersion(),
  latest: null
};

function syncViewportMetrics() {
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 900;
  const gap = Math.max(14, Math.min(32, Math.round(viewportHeight * 0.035)));

  document.documentElement.style.setProperty("--app-vh", `${viewportHeight}px`);
  document.documentElement.style.setProperty("--followup-gap", `${gap}px`);
}

const followupDimensionMeta = {
  politics: {
    label: "政治敏感与合规性",
    noteTitle: "复审更新说明",
    response: "从补充复审结果看，当前内容未出现明显政治导向偏差，但仍建议重点核查政策表述是否准确、是否存在容易引发误读的措辞，并在正式发布前补充来源依据。"
  },
  quality: {
    label: "内容质量与事实准度",
    noteTitle: "复审更新说明",
    response: "针对这轮追问，模型建议重点核查数据来源、效果描述和结论性语句。若涉及“最好”“唯一”“显著提升”等表述，建议改成更可验证、更克制的表达。"
  },
  legal: {
    label: "法律与社会风气",
    noteTitle: "复审更新说明",
    response: "这轮补充审核更偏法律与社会风气视角。当前建议重点排查侵权风险、未经授权引用、绝对化承诺，以及是否包含可能引发负面价值导向的描述。"
  },
  sentiment: {
    label: "舆情风险研判",
    noteTitle: "复审更新说明",
    response: "补充研判显示，这份内容在传播中更需要关注评论区放大效应。建议提前准备解释口径，并对容易引发争议的句子做降敏处理，降低舆情扩散风险。"
  }
};

const magicActionMetaByMaterial = {
  text: [
    { id: "text-recheck-suspect", label: "复核疑似违规内容", topic: "请围绕文字内容中疑似违规的部分重新复核，并判断首轮审核是否过严或过宽。", dimension: "quality", mode: "locate" },
    { id: "text-locate-risk", label: "定位高风险段落", topic: "请定位文字内容中的高风险段落，并指出具体问题出在哪里。", dimension: "quality", mode: "locate" },
    { id: "text-explain-basis", label: "解释判定依据", topic: "请解释文字内容被判定为风险的具体依据，以及对应了哪些规则要求。", dimension: "legal", mode: "explain" },
    { id: "text-check-misjudge", label: "排查误判内容", topic: "请排查文字内容中是否存在误判或边界模糊的地方，并重新说明判断。", dimension: "quality", mode: "explain" }
  ],
  document: [
    { id: "doc-recheck-suspect", label: "复核疑似违规内容", topic: "请围绕文稿中的疑似违规内容重新复核，并判断首轮审核是否准确。", dimension: "quality", mode: "locate" },
    { id: "doc-locate-risk", label: "定位高风险段落", topic: "请定位文稿中的高风险段落与原句，并指出为什么会被判为风险。", dimension: "quality", mode: "locate" },
    { id: "doc-explain-basis", label: "解释规则与法律依据", topic: "请解释文稿中高风险内容对应了哪些规则、平台要求或法律依据。", dimension: "legal", mode: "explain" },
    { id: "doc-check-misjudge", label: "排查误判或漏判", topic: "请排查文稿中是否存在误判或漏判内容，并结合上下文重新判断。", dimension: "quality", mode: "explain" }
  ],
  image: [
    { id: "image-text-risk", label: "复核图片文字风险", topic: "请围绕图片中已识别出的文字内容重新复核，看是否存在误判或边界模糊的风险。", dimension: "quality", mode: "locate" },
    { id: "image-visual-risk", label: "复核图片内容风险", topic: "请重新复核图片视觉内容本身是否存在涉黄、涉毒或其他违规风险。", dimension: "legal", mode: "locate" },
    { id: "image-locate-region", label: "定位高风险区域", topic: "请指出图片中高风险区域或敏感元素具体位于哪里，并说明原因。", dimension: "quality", mode: "locate" },
    { id: "image-explain-basis", label: "解释判定依据", topic: "请解释图片内容或图片文字被判定为风险的依据，以及对应规则要求。", dimension: "legal", mode: "explain" }
  ]
};

function createEmptyPendingReview() {
  return {
    dimensions: {},
    summaryText: ""
  };
}

function createInitialResultVersion() {
  return {
    summary: defaultResultTexts.summary,
    texts: {
      politics: defaultResultTexts.politics,
      quality: defaultResultTexts.quality,
      legal: defaultResultTexts.legal,
      sentiment: defaultResultTexts.sentiment
    },
    notes: {}
  };
}

function cloneResultVersion(version) {
  return {
    summary: version.summary,
    texts: { ...version.texts },
    notes: { ...version.notes }
  };
}

function getCurrentMagicActions() {
  return magicActionMetaByMaterial[currentReviewMaterial] || magicActionMetaByMaterial.text;
}

function autoResizeTextarea() {
  contentInput.style.height = "100%";
  contentInput.style.overflowY = "auto";
}

function updateCharCount() {
  charCount.textContent = `${contentInput.value.length}字符`;
}

function formatSize(size) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function detectKind(fileName, mimeType = "") {
  const lowerName = fileName.toLowerCase();

  if (mimeType.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(lowerName)) {
    return "图片素材";
  }

  if (lowerName.endsWith(".pdf")) {
    return "PDF 文档";
  }

  return "Word 文档";
}

function deriveReviewMaterialType() {
  if (!filesState.length) return "text";
  return filesState[0].kind === "图片素材" ? "image" : "document";
}

function fileToken(fileName) {
  const ext = fileName.split(".").pop().toUpperCase();
  return ext.slice(0, 4);
}

function getExtension(fileName) {
  const segments = fileName.toLowerCase().split(".");
  return segments.length > 1 ? segments.pop() : "";
}

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("is-visible");

  if (toastTimer) {
    window.clearTimeout(toastTimer);
  }

  toastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2200);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function syncReviewButtonState() {
  const hasText = Boolean(contentInput.value.trim());
  const hasFiles = filesState.length > 0;

  startReview.disabled = !hasText && !hasFiles;
}

function syncInputMode() {
  const hasFiles = filesState.length > 0;
  const isTextMode = !hasFiles && currentInputMode === "text";

  contentInput.disabled = !isTextMode;
  contentInput.placeholder = isTextMode ? defaultPlaceholder : "";
  charCount.parentElement.classList.toggle("is-hidden", !isTextMode);

  editorShell.classList.toggle("is-empty", !isTextMode && !hasFiles);
  editorShell.classList.toggle("has-file", hasFiles);
  modeToggle.textContent = isTextMode ? "附件模式" : "文字模式";
  modeToggle.disabled = hasFiles;

  if (!isTextMode) {
    contentInput.blur();
  }
}

function renderFiles() {
  if (!filesState.length) {
    attachmentState.innerHTML = "";
    attachmentState.classList.remove("is-visible");
    syncInputMode();
    syncReviewButtonState();
    return;
  }

  const [file] = filesState;
  attachmentState.innerHTML = `
    <article class="file-item file-item-inline">
      <div class="file-meta">
        <div class="file-type">${fileToken(file.name)}</div>
        <div class="file-info">
          <div class="file-name">${file.name}</div>
          <div class="file-desc">${file.kind} · ${formatSize(file.size)}</div>
          <div class="file-tip">点击当前区域可重新上传替换文件</div>
        </div>
      </div>
      <button class="remove-button" type="button" data-index="0" aria-label="移除文件">×</button>
    </article>
  `;
  attachmentState.classList.add("is-visible");

  syncInputMode();
  syncReviewButtonState();
}

function pushFiles(fileCollection) {
  const nextFile = Array.from(fileCollection)[0];
  if (!nextFile) return;

  const extension = getExtension(nextFile.name);
  if (!allowedExtensions.has(extension)) {
    if (filesState.length) {
      filesState.splice(0, filesState.length);
      renderFiles();
    } else {
      syncInputMode();
      syncReviewButtonState();
    }
    showToast("文件不支持，请上传 JPG、PNG、PDF、DOCX 或 DOC 文件");
    return;
  }

  if (contentInput.value.trim()) {
    contentInput.value = "";
    autoResizeTextarea();
    updateCharCount();
  }

  currentInputMode = "file";

  filesState.splice(0, filesState.length, {
    name: nextFile.name,
    size: nextFile.size || 256 * 1024,
    kind: detectKind(nextFile.name, nextFile.type)
  });

  renderFiles();
}

contentInput.addEventListener("input", () => {
  autoResizeTextarea();
  updateCharCount();
  syncInputMode();
  syncReviewButtonState();
});

function activateDragState(event) {
  event.preventDefault();
  composerPanel.classList.add("is-dragover");
}

function clearDragState() {
  composerPanel.classList.remove("is-dragover");
}

function setFollowupContext(dimension) {
  activeFollowupDimension = dimension;
}

function isFollowupOpen() {
  return followupOverlay.classList.contains("is-open");
}

function syncStageState() {
  const isResultVisible = screenStage.classList.contains("is-slid");
  document.body.classList.toggle("is-result-screen-visible", isResultVisible);
  document.body.classList.toggle("is-result-screen-ready", resultScreenReady);
  if (resultActionDock) {
    resultActionDock.setAttribute("aria-hidden", String(!(isResultVisible && resultScreenReady)));
  }
}

function buildDimensionNoteHtml(dimension, userPrompt, response) {
  const meta = followupDimensionMeta[dimension] || followupDimensionMeta.quality;
  return `
    <strong>${meta.noteTitle}</strong>
    <p>围绕“${escapeHtml(userPrompt)}”的补充复审结果：${escapeHtml(response)}</p>
  `;
}

function syncVersionSwitchState() {
  if (!showInitialResult || !showLatestResult || !resultVersionStatus) return;

  const hasLatest = Boolean(resultVersions.latest);
  showLatestResult.disabled = !hasLatest;

  showInitialResult.classList.toggle("is-active", currentResultVersion === "initial");
  showLatestResult.classList.toggle("is-active", currentResultVersion === "latest");
  showInitialResult.setAttribute("aria-selected", String(currentResultVersion === "initial"));
  showLatestResult.setAttribute("aria-selected", String(currentResultVersion === "latest"));

  if (!hasLatest) {
    resultVersionStatus.textContent = "当前展示首轮结果";
    return;
  }

  resultVersionStatus.textContent = currentResultVersion === "latest"
    ? "当前展示最新复审结果"
    : "当前展示首轮结果";
}

function renderResultVersion(versionKey = currentResultVersion) {
  const nextVersion = versionKey === "latest" && resultVersions.latest ? "latest" : "initial";
  const targetVersion = resultVersions[nextVersion] || resultVersions.initial;

  currentResultVersion = nextVersion;

  if (resultSummaryText) {
    resultSummaryText.textContent = targetVersion.summary;
  }

  Object.entries(resultTextMap).forEach(([dimension, element]) => {
    if (element) {
      element.textContent = targetVersion.texts[dimension] || defaultResultTexts[dimension];
    }

    const noteElement = document.getElementById(`note-${dimension}`);
    if (!noteElement) return;

    const noteHtml = targetVersion.notes[dimension] || "";
    noteElement.innerHTML = noteHtml;
    noteElement.classList.toggle("is-visible", Boolean(noteHtml));
  });

  syncVersionSwitchState();
}

function openFollowupDrawer() {
  followupOverlay.classList.add("is-open");
  followupOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-followup-open");
}

function closeFollowupDrawer() {
  followupOverlay.classList.remove("is-open");
  followupOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-followup-open");
}

function resetToFirstScreen() {
  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  screenStage.classList.remove("is-slid");
  closeFollowupDrawer();
  if (resultLoadingTimer) {
    window.clearTimeout(resultLoadingTimer);
    resultLoadingTimer = null;
  }
  firstScreen.scrollTop = 0;
  nextScreen.scrollTop = 0;
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  hasResultScreen = false;
  touchStartY = 0;
  resultTouchStartY = 0;
  resultTouchStartedAtTop = false;
  resultInteractionLocked = false;
  resultScreenReady = false;
  currentResultVersion = "initial";
  resultVersions.initial = createInitialResultVersion();
  resultVersions.latest = null;
  resultMain.classList.add("is-loading");
  resultVersionBar.classList.add("is-hidden");
  renderResultVersion("initial");
  syncStageState();
}

function finishResultLoading() {
  resultScreenReady = true;
  resultMain.classList.remove("is-loading");
  resultVersionBar.classList.remove("is-hidden");
  resultLoadingTimer = null;
  syncStageState();
}

function beginResultLoading() {
  resultScreenReady = false;
  resultMain.classList.add("is-loading");
  if (resultLoadingTimer) {
    window.clearTimeout(resultLoadingTimer);
  }
  syncStageState();
  resultLoadingTimer = window.setTimeout(() => {
    finishResultLoading();
  }, 3000);
}

function renderFollowupChips() {
  magicWandTrack.innerHTML = getCurrentMagicActions().map((action) => `
    <button
      class="followup-chip"
      type="button"
      data-action-id="${action.id}"
      data-topic="${escapeHtml(action.topic)}"
      data-dimension="${action.dimension}"
      data-mode="${action.mode}"
    >${escapeHtml(action.label)}</button>
  `).join("");
}

function syncApplyButtonState() {
  if (!applyFollowup) return;
  applyFollowup.disabled = !pendingReviewUpdate;
}

function syncFollowupModeUi() {
  renderFollowupChips();
  const activeButton = magicWandTrack.querySelector(`[data-action-id="${activeActionId}"]`);
  if (activeButton) {
    activeButton.classList.add("is-active");
    activeButton.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    return;
  }

  const fallbackAction = getCurrentMagicActions()[0];
  if (fallbackAction) {
    activeActionId = fallbackAction.id;
    const fallbackButton = magicWandTrack.querySelector(`[data-action-id="${activeActionId}"]`);
    if (fallbackButton) {
      fallbackButton.classList.add("is-active");
    }
  }
}

function appendThreadMessage(role, text) {
  const safeText = escapeHtml(text);
  const isAssistant = role === "assistant";
  const article = document.createElement("article");
  article.className = `thread-message ${isAssistant ? "thread-message-assistant" : "thread-message-user"}`;
  article.innerHTML = `
    <div class="thread-avatar">${isAssistant ? "审" : "你"}</div>
    <div class="thread-bubble">
      <p>${safeText}</p>
    </div>
  `;
  followupThread.appendChild(article);
  followupThread.scrollTop = followupThread.scrollHeight;
}

function resetFollowupState() {
  followupThread.innerHTML = "";
  appendThreadMessage("assistant", initialFollowupMessage);
  pendingReviewDraft = createEmptyPendingReview();
  pendingReviewUpdate = false;
  followupInput.value = "";
  syncApplyButtonState();
}

function updateDimensionNote(dimension, userPrompt, response) {
  const target = document.getElementById(`note-${dimension}`);
  if (!target) return;
  target.innerHTML = buildDimensionNoteHtml(dimension, userPrompt, response);
  target.classList.add("is-visible");
}

function resetResultTexts() {
  resultVersions.initial = createInitialResultVersion();
  resultVersions.latest = null;
  currentResultVersion = "initial";
  renderResultVersion("initial");
}

function inferDimensionFromPrompt(prompt) {
  if (/政治|合规|政策|敏感/i.test(prompt)) return "politics";
  if (/法律|侵权|违规|风气/i.test(prompt)) return "legal";
  if (/舆情|传播|评论|风险/i.test(prompt)) return "sentiment";
  return "quality";
}

function inferModeFromPrompt(prompt) {
  if (/微博|小红书|公众号|平台/i.test(prompt)) return "strategy";
  if (/只看|只检查|重点看|定位|标题|图片|复查|重新评估|重审/i.test(prompt)) return "locate";
  return "explain";
}

function buildUpdatedCardText(prompt, dimension, mode) {
  const meta = followupDimensionMeta[dimension] || followupDimensionMeta.quality;

  if (mode === "strategy") {
    return `已结合发布场景对 ${meta.label} 进行了重新判断。当前结论更关注平台传播语境、标题表达强度以及容易被放大的敏感点。`;
  }

  if (mode === "explain") {
    return `已根据本轮复审对 ${meta.label} 的判定依据进行了重新梳理。当前结果更强调上下文语境、触发位置和导致误判的可能原因。`;
  }

  return `已根据本轮复审对 ${meta.label} 进行了重新核查。当前结论更聚焦“${prompt}”相关内容，并对首轮判断作了补充修正。`;
}

function buildPendingSummaryText() {
  const dimensions = Object.keys(pendingReviewDraft.dimensions);
  if (!dimensions.length) {
    return defaultResultTexts.summary;
  }

  const labels = dimensions.map((dimension) => {
    const meta = followupDimensionMeta[dimension] || followupDimensionMeta.quality;
    return meta.label;
  });

  return `已结合本轮复审对${labels.join("、")}进行了重新判断。当前结果会优先反映用户补充说明、上下文纠偏和发布场景后的二次审核结论。`;
}

function buildAssistantReply(prompt, dimension, mode) {
  const meta = followupDimensionMeta[dimension] || followupDimensionMeta.quality;
  if (mode === "explain") {
    return `已收到本轮复审解释需求：${prompt}\n\n复审判断：我会重新核对首轮结论的依据，重点看触发句、上下文语境和是否存在过度放大风险的问题。\n纠偏说明：如果发现首轮结论解释不充分，复审会补充更明确的触发原因和判断范围。\n下一步：如果你认可这轮复审方向，可以点击“更新复审结果”再同步替换第二屏结果。`;
  }

  if (mode === "strategy") {
    return `已收到本轮场景复审需求：${prompt}\n\n复审判断：我会结合目标发布场景重新评估这篇内容，而不是只沿用首轮通用结论。\n场景说明：不同平台对标题、首屏表达、事实依据和舆情放大点的敏感程度不同，复审会按对应场景重新聚焦。\n下一步：如果你认可这轮复审方向，可以点击“更新复审结果”再同步替换第二屏结果。`;
  }

  return `已收到本轮定向复审需求：${prompt}\n\n复审判断：我会围绕 ${meta.label} 重新核查首轮结论是否存在判断过宽、证据不足或忽略上下文的问题。\n补充说明：${meta.response}\n下一步：如果你认可这轮复审方向，可以点击“更新复审结果”再同步替换第二屏结果。`;
}

function submitFollowup(prompt, preferredDimension, preferredMode = inferModeFromPrompt(prompt)) {
  const trimmed = prompt.trim();
  if (!trimmed) return;

  const dimension = preferredDimension || inferDimensionFromPrompt(trimmed);
  const response = buildAssistantReply(trimmed, dimension, preferredMode);

  setFollowupContext(dimension);
  appendThreadMessage("user", trimmed);
  window.setTimeout(() => {
    appendThreadMessage("assistant", response);
    pendingReviewDraft.dimensions[dimension] = {
      prompt: trimmed,
      response,
      cardText: buildUpdatedCardText(trimmed, dimension, preferredMode)
    };
    pendingReviewDraft.summaryText = buildPendingSummaryText();
    pendingReviewUpdate = true;
    syncApplyButtonState();
  }, 220);
}

function applyPendingReviewResults() {
  if (!pendingReviewUpdate) return;

  const baseVersion = resultVersions.latest ? cloneResultVersion(resultVersions.latest) : cloneResultVersion(resultVersions.initial);
  baseVersion.summary = pendingReviewDraft.summaryText || baseVersion.summary;

  Object.entries(pendingReviewDraft.dimensions).forEach(([dimension, draft]) => {
    baseVersion.texts[dimension] = draft.cardText || baseVersion.texts[dimension];
    baseVersion.notes[dimension] = buildDimensionNoteHtml(dimension, draft.prompt, draft.response);
  });

  resultVersions.latest = baseVersion;
  renderResultVersion("latest");

  appendThreadMessage("assistant", "已根据本轮复审对第二屏结果进行了更新显示。你可以继续追问，或返回结果页查看新的复审结论。");
  pendingReviewDraft = createEmptyPendingReview();
  pendingReviewUpdate = false;
  syncApplyButtonState();
}

function shouldKeepTextareaScroll(target) {
  if (currentInputMode !== "text") return false;
  if (target !== contentInput) return false;
  return contentInput.scrollHeight > contentInput.clientHeight + 1;
}

function isThreadInteractionTarget(target) {
  return Boolean(target.closest(".followup-drawer, .followup-thread, #followupInput"));
}

["dragenter", "dragover"].forEach((eventName) => {
  composerPanel.addEventListener(eventName, activateDragState);
});

composerPanel.addEventListener("dragleave", (event) => {
  if (composerPanel.contains(event.relatedTarget)) return;
  clearDragState();
});

composerPanel.addEventListener("drop", (event) => {
  event.preventDefault();
  clearDragState();

  if (event.dataTransfer.files.length) {
    pushFiles(event.dataTransfer.files);
  }
});

editorShell.addEventListener("click", () => {
  if (currentInputMode === "file") {
    fileInput.click();
  }
});

emptyBackground.addEventListener("click", (event) => {
  event.stopPropagation();
  fileInput.click();
});

modeToggle.addEventListener("click", () => {
  if (currentInputMode === "file" || filesState.length) {
    filesState.splice(0, filesState.length);
    fileInput.value = "";
    currentInputMode = "text";
    renderFiles();
    contentInput.focus();
    return;
  }

  currentInputMode = "file";
  contentInput.value = "";
  autoResizeTextarea();
  updateCharCount();
  syncInputMode();
  syncReviewButtonState();
});

fileInput.addEventListener("change", () => {
  if (fileInput.files.length) {
    pushFiles(fileInput.files);
    fileInput.value = "";
  }
});

attachmentState.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".remove-button");
  if (!removeButton) return;

  event.stopPropagation();
  filesState.splice(Number(removeButton.dataset.index), 1);
  renderFiles();
});

magicWandTrack.addEventListener("click", (event) => {
  const chip = event.target.closest(".followup-chip");
  if (!chip) return;

  magicWandTrack.querySelectorAll(".followup-chip").forEach((item) => {
    item.classList.toggle("is-active", item === chip);
  });
  activeActionId = chip.dataset.actionId || activeActionId;
  const prompt = chip.dataset.topic || chip.textContent.trim();
  const dimension = chip.dataset.dimension || inferDimensionFromPrompt(prompt);
  const mode = chip.dataset.mode || inferModeFromPrompt(prompt);
  submitFollowup(prompt, dimension, mode);
});

sendFollowup.addEventListener("click", () => {
  const prompt = followupInput.value;
  if (!prompt.trim()) return;
  submitFollowup(prompt, activeFollowupDimension, inferModeFromPrompt(prompt));
  followupInput.value = "";
});

applyFollowup.addEventListener("click", () => {
  applyPendingReviewResults();
});

showInitialResult.addEventListener("click", () => {
  renderResultVersion("initial");
});

showLatestResult.addEventListener("click", () => {
  if (!resultVersions.latest) return;
  renderResultVersion("latest");
});

followupInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.shiftKey) return;
  event.preventDefault();
  sendFollowup.click();
});

openFollowup.addEventListener("click", () => {
  openFollowupDrawer();
});

closeFollowup.addEventListener("click", () => {
  closeFollowupDrawer();
});

closeFollowupMask.addEventListener("click", () => {
  closeFollowupDrawer();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isFollowupOpen()) {
    closeFollowupDrawer();
  }
});

startReview.addEventListener("click", () => {
  const textLength = contentInput.value.trim().length;
  const fileCount = filesState.length;

  if (!textLength && !fileCount) return;

  hasResultScreen = true;
  currentReviewMaterial = deriveReviewMaterialType();
  activeActionId = getCurrentMagicActions()[0]?.id || "";
  closeFollowupDrawer();
  resetResultTexts();
  resetFollowupState();
  beginResultLoading();
  followupDescription.textContent = "复审助手会基于首轮审核结果，帮助你进一步解释风险来源、聚焦重点问题，并形成待确认的复审结果，确认后再更新结果页。";
  followupInput.placeholder = currentReviewMaterial === "image"
    ? "请输入你想继续复审的问题，例如：我认为这块区域不该判高风险，请重新判断。"
    : "请输入你想继续复审的问题，例如：我认为这段判断过严，请结合上下文重新审核。";
  syncFollowupModeUi();
  followupHint.textContent = fileCount
    ? currentReviewMaterial === "image"
      ? "当前会基于已上传图片的首轮审核结果继续分析"
      : "当前会基于已上传文稿的首轮审核结果继续分析"
    : "当前会基于已输入文案继续分析";
  screenStage.classList.add("is-slid");
  syncStageState();
});

backToFirst.addEventListener("click", () => {
  screenStage.classList.remove("is-slid");
  syncStageState();
});

function canSlideToResult() {
  return hasResultScreen && !screenStage.classList.contains("is-slid");
}

function canSlideBackToFirst() {
  return hasResultScreen && screenStage.classList.contains("is-slid") && !isFollowupOpen();
}

function slideToResultFromFirst() {
  if (!canSlideToResult()) return;
  screenStage.classList.add("is-slid");
  syncStageState();
}

function slideBackToFirst() {
  if (!canSlideBackToFirst()) return;
  screenStage.classList.remove("is-slid");
  syncStageState();
}

firstScreen.addEventListener("wheel", (event) => {
  if (!canSlideToResult()) return;
  if (shouldKeepTextareaScroll(event.target)) return;
  if (event.deltaY <= 12) return;

  event.preventDefault();
  slideToResultFromFirst();
}, { passive: false });

firstScreen.addEventListener("touchstart", (event) => {
  if (!canSlideToResult()) return;
  if (shouldKeepTextareaScroll(event.target)) {
    touchStartY = 0;
    return;
  }
  touchStartY = event.touches[0].clientY;
}, { passive: true });

firstScreen.addEventListener("touchend", (event) => {
  if (!canSlideToResult()) return;
  if (!touchStartY) return;

  const touchEndY = event.changedTouches[0].clientY;
  if (touchStartY - touchEndY > 42) {
    slideToResultFromFirst();
  }

  touchStartY = 0;
}, { passive: true });

nextScreen.addEventListener("wheel", (event) => {
  if (!canSlideBackToFirst()) return;
  if (isThreadInteractionTarget(event.target)) return;
  if (nextScreen.scrollTop > 0) return;
  if (event.deltaY > resultReturnWheelThreshold) return;

  event.preventDefault();
  slideBackToFirst();
}, { passive: false });

nextScreen.addEventListener("touchstart", (event) => {
  if (!canSlideBackToFirst()) return;
  resultInteractionLocked = isThreadInteractionTarget(event.target);
  resultTouchStartY = event.touches[0].clientY;
  resultTouchStartedAtTop = nextScreen.scrollTop <= 0;
}, { passive: true });

nextScreen.addEventListener("touchend", (event) => {
  if (!canSlideBackToFirst()) return;
  if (resultInteractionLocked) {
    resultInteractionLocked = false;
    return;
  }
  if (!resultTouchStartedAtTop) return;
  if (nextScreen.scrollTop > 0) return;

  const touchEndY = event.changedTouches[0].clientY;
  if (touchEndY - resultTouchStartY > resultReturnTouchThreshold) {
    slideBackToFirst();
  }
}, { passive: true });

syncInputMode();
autoResizeTextarea();
updateCharCount();
renderFiles();
syncReviewButtonState();
resetFollowupState();
syncFollowupModeUi();
syncViewportMetrics();
resetToFirstScreen();

window.addEventListener("load", () => {
  syncViewportMetrics();
  resetToFirstScreen();
});

window.addEventListener("pageshow", () => {
  syncViewportMetrics();
  resetToFirstScreen();
});

window.addEventListener("resize", () => {
  syncViewportMetrics();
});
