const contentInput = document.getElementById("contentInput");
const charCount = document.getElementById("charCount");
const screenStage = document.getElementById("screenStage");
const firstScreen = document.querySelector(".screen-panel-current");
const nextScreen = document.getElementById("nextScreen");
const composerPanel = document.getElementById("composerPanel");
const editorShell = document.getElementById("editorShell");
const emptyBackground = document.getElementById("emptyBackground");
const attachmentState = document.getElementById("attachmentState");
const fileInput = document.getElementById("fileInput");
const modeToggle = document.getElementById("modeToggle");
const startReview = document.getElementById("startReview");
const backToFirst = document.getElementById("backToFirst");
const toast = document.getElementById("toast");

const filesState = [];
const defaultPlaceholder = "请输入或复制您的文案内容，我们将快速进行智能审核";
const allowedExtensions = new Set(["jpg", "png", "pdf", "docx", "doc"]);
const resultReturnWheelThreshold = -120;
const resultReturnTouchThreshold = 110;
let toastTimer = null;
let hasResultScreen = false;
let currentInputMode = "file";
let touchStartY = 0;
let resultTouchStartY = 0;
let resultTouchStartedAtTop = false;

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

function shouldKeepTextareaScroll(target) {
  if (currentInputMode !== "text") return false;
  if (target !== contentInput) return false;
  return contentInput.scrollHeight > contentInput.clientHeight + 1;
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

startReview.addEventListener("click", () => {
  const textLength = contentInput.value.trim().length;
  const fileCount = filesState.length;

  if (!textLength && !fileCount) return;

  hasResultScreen = true;
  screenStage.classList.add("is-slid");
});

backToFirst.addEventListener("click", () => {
  screenStage.classList.remove("is-slid");
});

function canSlideToResult() {
  return hasResultScreen && !screenStage.classList.contains("is-slid");
}

function canSlideBackToFirst() {
  return hasResultScreen && screenStage.classList.contains("is-slid");
}

function slideToResultFromFirst() {
  if (!canSlideToResult()) return;
  screenStage.classList.add("is-slid");
}

function slideBackToFirst() {
  if (!canSlideBackToFirst()) return;
  screenStage.classList.remove("is-slid");
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
  if (nextScreen.scrollTop > 0) return;
  if (event.deltaY > resultReturnWheelThreshold) return;

  event.preventDefault();
  slideBackToFirst();
}, { passive: false });

nextScreen.addEventListener("touchstart", (event) => {
  if (!canSlideBackToFirst()) return;
  resultTouchStartY = event.touches[0].clientY;
  resultTouchStartedAtTop = nextScreen.scrollTop <= 0;
}, { passive: true });

nextScreen.addEventListener("touchend", (event) => {
  if (!canSlideBackToFirst()) return;
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
