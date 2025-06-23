const API_URL = "http://localhost:3000/financials";
const CATEGORY_URL = "http://localhost:3000/categories";

let transactions = [];
let categories = [];
let editingId = null;

// Modal yönetimi
const modal = document.getElementById("category-modal");
document.getElementById("open-category-modal").onclick = () => modal.style.display = "block";
document.getElementById("close-category-modal").onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };

window.onload = async () => {
  try {
    const [res1, res2] = await Promise.all([
      fetch(API_URL),
      fetch(CATEGORY_URL)
    ]);
    transactions = await res1.json();
    categories = await res2.json();

    populateCategorySelects();
    updateTable();
    updateTotals();
    renderCategoryList();
  } catch (err) {
    console.error("Veri alınırken hata oluştu:", err);
  }
};

function populateCategorySelects() {
  const formSelect = document.getElementById("category");
  const filterSelect = document.getElementById("filter-category");

  formSelect.innerHTML = "";
  filterSelect.innerHTML = '<option value="">Tüm Kategoriler</option>';

  categories.forEach(cat => {
    if (cat.category !== "Tüm Kategoriler") {
      const option = document.createElement("option");
      option.value = cat.id;
      option.textContent = cat.category;
      formSelect.appendChild(option);
    }

    const filterOption = document.createElement("option");
    filterOption.value = cat.id;
    filterOption.textContent = cat.category;
    filterSelect.appendChild(filterOption);
  });
}

function getCategoryNameById(id) {
  const cat = categories.find(c => c.id === id);
  return cat ? cat.category : "Silinmiş";
}

document.getElementById("transaction-form").addEventListener("submit", async function (e) {
  e.preventDefault();

  const desc = document.getElementById("desc").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const date = document.getElementById("date").value;
  const type = document.getElementById("type").value;
  const category = document.getElementById("category").value;

  if (!desc || isNaN(amount) || !date || amount <= 0 || !category) {
    alert("Geçersiz bilgi !");
    return;
  }

  const newTransaction = { description: desc, amount, date, type, category };

  if (editingId) {
    const res = await fetch(`${API_URL}/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTransaction)
    });

    const updated = await res.json();
    const index = transactions.findIndex(t => t.id === editingId);
    transactions[index] = updated;
    editingId = null;

    document.querySelector("#transaction-form button").textContent = "Ekle";
  } else {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTransaction)
    });

    const saved = await res.json();
    transactions.push(saved);
  }

  updateTable();
  updateTotals();
  this.reset();
  document.getElementById("cancel-edit").style.display = "none";
});

function updateTable() {
  const list = document.getElementById("financials");
  list.innerHTML = "";

  const selectedType = document.getElementById("filter-type").value;
  const selectedCategoryId = document.getElementById("filter-category").value;

  const filtered = transactions.filter(t => {
    return (selectedType === "" || t.type === selectedType) &&
      (selectedCategoryId === "" || t.category === selectedCategoryId);
  });

  filtered.forEach((t) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td data-label="Açıklama">${t.description}</td>
      <td data-label="Miktar">₺${t.amount.toFixed(2)}</td>
      <td data-label="Tarih">${t.date}</td>
      <td data-label="Tür">${t.type}</td>
      <td data-label="Kategori">${getCategoryNameById(t.category)}</td>
      <td data-label="İşlem">
        <button onclick="editTransaction('${t.id}')">Düzenle</button>
        <button onclick="deleteTransaction('${t.id}')">Sil</button>
      </td>
    `;

    list.appendChild(row);
  });

  updateTotals();
  updateCharts();
}

async function deleteTransaction(id) {
  await fetch(`${API_URL}/${id}`, { method: "DELETE" });
  transactions = transactions.filter(t => t.id !== id);
  updateTable();
  updateTotals();
  updateCharts();
}

function updateTotals() {
  const selectedType = document.getElementById("filter-type").value;
  const selectedCategory = document.getElementById("filter-category").value;

  let income = 0;
  let expense = 0;

  transactions.forEach(t => {
    const matchType = selectedType === "" || t.type === selectedType;
    const matchCategory = selectedCategory === "" || t.category === selectedCategory;

    if (matchType && matchCategory) {
      if (t.type === "gelir") income += t.amount;
      else if (t.type === "gider") expense += t.amount;
    }
  });

  document.getElementById("total-income").textContent = `₺${income.toFixed(2)}`;
  document.getElementById("total-expense").textContent = `₺${expense.toFixed(2)}`;
}


function editTransaction(id) {
  const transaction = transactions.find(t => t.id === id);
  if (!transaction) return;

  document.getElementById("desc").value = transaction.description;
  document.getElementById("amount").value = transaction.amount;
  document.getElementById("date").value = transaction.date;
  document.getElementById("type").value = transaction.type;
  document.getElementById("category").value = transaction.category;

  editingId = id;

  document.querySelector("#transaction-form button").textContent = "Güncelle";
  document.getElementById("cancel-edit").style.display = "inline-block";
}

document.getElementById("cancel-edit").addEventListener("click", () => {
  document.getElementById("transaction-form").reset();
  editingId = null;
  document.querySelector("#transaction-form button").textContent = "Ekle";
  document.getElementById("cancel-edit").style.display = "none";
});

let incomeChart, expenseChart;

function updateCharts() {
  const incomeData = {};
  const expenseData = {};

  transactions.forEach(t => {
    const target = t.type === "gelir" ? incomeData : expenseData;
    const categoryName = getCategoryNameById(t.category);
    target[categoryName] = (target[categoryName] || 0) + t.amount;
  });

  const incomeLabels = Object.keys(incomeData);
  const incomeValues = Object.values(incomeData);
  const expenseLabels = Object.keys(expenseData);
  const expenseValues = Object.values(expenseData);

  if (incomeChart) incomeChart.destroy();
  if (expenseChart) expenseChart.destroy();

  incomeChart = new Chart(document.getElementById("incomeChart").getContext("2d"), {
    type: "pie",
    data: {
      labels: incomeLabels,
      datasets: [{ data: incomeValues, backgroundColor: generateColors(incomeLabels.length) }]
    },
    options: { plugins: { legend: { position: 'right' } } }
  });

  expenseChart = new Chart(document.getElementById("expenseChart").getContext("2d"), {
    type: "pie",
    data: {
      labels: expenseLabels,
      datasets: [{ data: expenseValues, backgroundColor: generateColors(expenseLabels.length) }]
    },
    options: { plugins: { legend: { position: 'right' } } }
  });
}

function generateColors(count) {
  const colors = [];
  const baseHue = Math.floor(Math.random() * 360); // Başlangıç tonunu rastgele belirle
  const hueStep = 360 / count;

  for (let i = 0; i < count; i++) {
    const hue = (baseHue + i * hueStep + Math.random() * 10) % 360; // Küçük bir rastgelelik ekle
    colors.push(`hsl(${hue}, 70%, 60%)`);
  }

  return colors;
}


document.getElementById("filter-type").addEventListener("change", updateTable);
document.getElementById("filter-category").addEventListener("change", updateTable);
document.getElementById("clear-filters").addEventListener("click", () => {
  document.getElementById("filter-type").value = "";
  document.getElementById("filter-category").value = "";
  updateTable();
});

// Kategori Ekleme
document.getElementById("category-form").addEventListener("submit", async function (e) {
  e.preventDefault();
  const name = document.getElementById("new-category").value.trim();
  if (!name) return;

  const newCategory = { category: name };
  const res = await fetch(CATEGORY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newCategory)
  });

  const saved = await res.json();
  categories.push(saved);
  populateCategorySelects();
  renderCategoryList();
  this.reset();
});

// Kategori Listesi ve Silme
function renderCategoryList() {
  const list = document.getElementById("category-list");
  list.innerHTML = "";

  categories.forEach(cat => {
    if (cat.category !== "Tüm Kategoriler") {
      const li = document.createElement("li");
      li.textContent = cat.category + " ";
      const btn = document.createElement("button");
      btn.textContent = "Sil";
      btn.onclick = async () => {
        await fetch(`${CATEGORY_URL}/${cat.id}`, { method: "DELETE" });
        categories = categories.filter(c => c.id !== cat.id);
        populateCategorySelects();
        renderCategoryList();
        updateTable();
      };
      li.appendChild(btn);
      list.appendChild(li);
    }
  });
}
