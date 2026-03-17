const alertMask = document.getElementById("alertMask");
const openModal = document.getElementById("openModal");
const closeModal = document.getElementById("closeModal");
const cancelModal = document.getElementById("cancelModal");
const confirmModal = document.getElementById("confirmModal");

function setModalVisible(visible) {
  alertMask.classList.toggle("is-visible", visible);
  alertMask.setAttribute("aria-hidden", String(!visible));
}

openModal.addEventListener("click", () => {
  setModalVisible(true);
});

[closeModal, cancelModal, confirmModal].forEach((button) => {
  button.addEventListener("click", () => {
    setModalVisible(false);
  });
});

alertMask.addEventListener("click", (event) => {
  if (event.target === alertMask) {
    setModalVisible(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setModalVisible(false);
  }
});
