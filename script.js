const API_URL = "http://localhost:3000/financials";
let transactions = [];

window.onload = async () => {
  const res = await fetch(API_URL);
  transactions = await res.json();
  updateTable();
  updateTotals();
};

document.getElementById("transaction-form").addEventListener("submit", async function (e) {
  e.preventDefault();

  const desc = document.getElementById("desc").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const date = document.getElementById("date").value;
  const type = document.getElementById("type").value;
  const category = document.getElementById("category").value;

  if (!desc || isNaN(amount) || !date || amount <= 0) {
    alert("Geçerli bilgi gir.");
    return;
  }

  const newTransaction = { description: desc, amount, date, type, category };

  if (editingId) {
    // Güncelleme işlemi
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
    // Yeni ekleme işlemi
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
});

function updateTable() {
  const list = document.getElementById("financials");
  list.innerHTML = "";

  transactions.forEach((t) => {
    const row = document.createElement("tr");
    row.innerHTML = `
  <td data-label="Açıklama">${t.description}</td>
  <td data-label="Miktar">₺${t.amount.toFixed(2)}</td>
  <td data-label="Tarih">${t.date}</td>
  <td data-label="Tür">${t.type}</td>
  <td data-label="Kategori">${t.category}</td>
  <td data-label="İşlem">
    <button onclick="editTransaction('${t.id}')">Düzenle</button>
    <button onclick="deleteTransaction('${t.id}')">Sil</button>
  </td>
`;

    list.appendChild(row);
  });
}

async function deleteTransaction(id) {
  await fetch(`${API_URL}/${id}`, { method: "DELETE" });
  transactions = transactions.filter(t => t.id !== id);
  updateTable();
  updateTotals();
}

function updateTotals() {
  let income = 0;
  let expense = 0;

  transactions.forEach(t => {
    if (t.type === "gelir") income += t.amount;
    else expense += t.amount;
  });

  document.getElementById("total-income").textContent = `₺${income.toFixed(2)}`;
  document.getElementById("total-expense").textContent = `₺${expense.toFixed(2)}`;
}

let editingId = null;

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
  // Formu sıfırla
  document.getElementById("transaction-form").reset();

  // Düzenleme modunu kapat
  editingId = null;

  // Buton metnini geri "Ekle" yap
  document.querySelector("#transaction-form button").textContent = "Ekle";

  // Vazgeç butonunu gizle
  document.getElementById("cancel-edit").style.display = "none";
});
