const modalMask = document.getElementById("modalMask");
const openModal = document.getElementById("openModal");
const confirmButton = document.getElementById("confirmButton");
const resultList = document.getElementById("resultList");
const successCount = document.getElementById("successCount");
const failedCount = document.getElementById("failedCount");

const resultItems = [
  {
    comment: "感谢支持，欢迎继续关注本次活动动态。",
    account: "抖音号_品牌主账号",
    status: "成功"
  },
  {
    comment: "活动福利已上线，点击主页链接即可参与。",
    account: "小红书_推广账号02",
    status: "失败"
  },
  {
    comment: "已为您同步发布，稍后可在记录中查看详情。",
    account: "视频号_运营账号A",
    status: "失败"
  },
  {
    comment: "新品发售提醒已经发送，请留意后台反馈数据。",
    account: "微博_活动账号03",
    status: "失败"
  },
  {
    comment: "本次秒杀活动名额有限，点击商品卡片立即参与。",
    account: "快手_店播账号01",
    status: "失败"
  },
  {
    comment: "感谢报名，直播开场前会再次提醒您进入会场。",
    account: "视频号_社群账号B",
    status: "成功"
  },
  {
    comment: "优惠券已经准备好，进入主页即可一键领取使用。",
    account: "小红书_种草账号08",
    status: "失败"
  },
  {
    comment: "这条评论用于二次触达，请核对是否需要继续保留。",
    account: "微博_矩阵账号11",
    status: "失败"
  },
  {
    comment: "服务升级通知已发布完成，欢迎随时提交使用反馈。",
    account: "抖音号_售后账号",
    status: "成功"
  },
  {
    comment: "今晚八点直播抽奖，记得提前预约并打开开播提醒。",
    account: "快手_直播账号07",
    status: "失败"
  }
];

function setModalVisible(visible) {
  modalMask.classList.toggle("is-visible", visible);
  modalMask.setAttribute("aria-hidden", String(!visible));
}

function renderResultList(items) {
  resultList.innerHTML = "";

  let successTotal = 0;
  let failedTotal = 0;

  items.forEach((item, index) => {
    const row = document.createElement("div");
    const isSuccess = item.status === "成功";
    const statusClass = isSuccess ? "is-success" : "is-failed";

    if (isSuccess) {
      successTotal += 1;
    } else {
      failedTotal += 1;
    }

    row.className = "list-row";
    row.innerHTML = `
      <span>${index + 1}</span>
      <span title="${item.comment}">${item.comment}</span>
      <span>${item.account}</span>
      <span><i class="status-text ${statusClass}">${item.status}</i></span>
    `;
    resultList.appendChild(row);
  });

  successCount.textContent = `${successTotal}条`;
  failedCount.textContent = `${failedTotal}条`;
}

renderResultList(resultItems);

openModal.addEventListener("click", () => {
  setModalVisible(true);
});

confirmButton.addEventListener("click", () => {
  setModalVisible(false);
});

modalMask.addEventListener("click", (event) => {
  if (event.target === modalMask) {
    setModalVisible(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setModalVisible(false);
  }
});
