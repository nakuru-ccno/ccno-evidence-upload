<script>
const PROXY_URL = "https://nccnoproxyy.onrender.com/upload-evidence";

const officerEmailInput = document.getElementById("officerEmail");
const evidenceNameInput = document.getElementById("evidenceName");
const categorySelect = document.getElementById("category");
const indicatorSelect = document.getElementById("indicator");
const subCountySelect = document.getElementById("subCounty");
const filesInput = document.getElementById("files");
const spinner = document.getElementById("spinner");
const successMsg = document.getElementById("success");
const errorMsg = document.getElementById("error");
const uploadBtn = document.getElementById("uploadBtn");
const progressContainer = document.getElementById("progressContainer");
const progressBar = document.getElementById("progressBar");

function showError(msg) {
  errorMsg.style.display = msg ? "block" : "none";
  errorMsg.textContent = msg;
  successMsg.style.display = "none";
}

function showSuccess(msg) {
  successMsg.style.display = "block";
  successMsg.textContent = msg;
  errorMsg.style.display = "none";
  setTimeout(() => { successMsg.style.display = "none"; }, 4000);
}

function resetForm() {
  officerEmailInput.value = "";
  evidenceNameInput.value = "";
  categorySelect.value = "";
  indicatorSelect.innerHTML = '<option value="">Select Indicator</option>';
  subCountySelect.value = "";
  filesInput.value = "";
  progressBar.style.width = "0%";
  progressContainer.style.display = "none";
}

uploadBtn.addEventListener("click", () => {
  const officerEmail = officerEmailInput.value.trim();
  const evidenceName = evidenceNameInput.value.trim();
  const category = categorySelect.value;
  const indicator = indicatorSelect.value;
  const subCounty = subCountySelect.value;
  const files = filesInput.files;

  if (!officerEmail || !evidenceName || !category || !indicator || !subCounty || !files.length) {
    return showError("Please fill all fields and select at least one PDF file.");
  }

  spinner.style.display = "block";
  progressContainer.style.display = "block";
  progressBar.style.width = "0%";
  showError("");

  const formData = new FormData();
  formData.append("officerEmail", officerEmail); // <--- added email
  formData.append("evidenceName", evidenceName);
  formData.append("category", category);
  formData.append("indicator", indicator);
  formData.append("subCounty", subCounty);

  for (let file of files) {
    formData.append("files", file, file.name);
  }

  const xhr = new XMLHttpRequest();
  xhr.open("POST", PROXY_URL, true);

  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable) {
      const percent = (event.loaded / event.total) * 100;
      progressBar.style.width = percent + "%";
    }
  };

  xhr.onload = () => {
    spinner.style.display = "none";
    if (xhr.status >= 200 && xhr.status < 300) {
      showSuccess(`${evidenceName}_${subCounty}.pdf submitted successfully. 📩 You will receive an email confirmation.`);
      resetForm();
    } else {
      showError("Upload failed. Try again.");
    }
  };

  xhr.onerror = () => {
    spinner.style.display = "none";
    showError("Network error. Try again.");
  };

  xhr.send(formData);
});
</script>
