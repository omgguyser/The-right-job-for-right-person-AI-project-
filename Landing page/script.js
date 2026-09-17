/* ==========================================================
   The Right Job For Right Person — Shared Script
   ใช้ร่วมกันทุกหน้า: product.html / order.html / admin.html
   ========================================================== */

// ----- ตั้งค่าตรงนี้ -----
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx8xP6aekEfasfcS9GMxNCRV-Y_e-6vUhyBhK-HOsUZm1Yxqt_BSWvWJRw6DXSxwj8AIw/exec"; // URL ของ Google Apps Script Web App (POST รับออเดอร์)
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSLqNKCMMDRz-DTuS3RIAJPFGhuM9exp-mwrxUGmeu2DHWNtn-DENs69P35emMine0qOCA8iaWAC7ZS/pubhtml?gid=0&single=true";                 // URL ของ Google Sheet ที่ Publish เป็น CSV (สำหรับหน้า admin)
const PRODUCTS_JSON_URL = "products.json";

// รายการตัวกรองตาม Aptitude
const APTITUDE_FILTERS = [
  { label: "ทั้งหมด", value: "all" },
  { label: "Calculate", value: "Calculate" },
  { label: "Remember", value: "Remember" },
  { label: "Code", value: "Code" },
  { label: "Act", value: "Act" },
];

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("product-list")) {
    initProductPage();
  }
  if (document.getElementById("orderForm")) {
    initOrderPage();
  }
  if (document.querySelector("#ordersTable tbody")) {
    initAdminPage();
  }
});

/* ==========================================================
   1) product.html — แสดงรายการงาน + ตัวกรอง Aptitude
   ========================================================== */
function initProductPage() {
  const listEl = document.getElementById("product-list");
  const filterBarEl = document.getElementById("filter-bar");

  fetch(PRODUCTS_JSON_URL)
    .then((res) => {
      if (!res.ok) throw new Error("โหลด products.json ไม่สำเร็จ");
      return res.json();
    })
    .then((products) => {
      const urlParams = new URLSearchParams(window.location.search);
      const initialFilter = urlParams.get("Aptitude") || "all";

      renderFilterBar(filterBarEl, initialFilter, (selected) => {
        renderProductList(listEl, products, selected);
      });

      renderProductList(listEl, products, initialFilter);
    })
    .catch((err) => {
      console.error(err);
      listEl.innerHTML =
        '<p class="text-center">ไม่สามารถโหลดรายการงานได้ในขณะนี้</p>';
    });
}

function renderFilterBar(filterBarEl, activeValue, onChange) {
  if (!filterBarEl) return;
  filterBarEl.innerHTML = "";

  APTITUDE_FILTERS.forEach((filter) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn filter-btn";
    btn.textContent = filter.label;
    btn.dataset.value = filter.value;

    if (filter.value === activeValue) {
      btn.classList.add("filter-btn--active");
    }

    btn.addEventListener("click", () => {
      filterBarEl
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("filter-btn--active"));
      btn.classList.add("filter-btn--active");
      onChange(filter.value);
    });

    filterBarEl.appendChild(btn);
  });
}

function renderProductList(listEl, products, filterValue) {
  if (!listEl) return;

  const filtered =
    filterValue === "all"
      ? products
      : products.filter((p) => p.Aptitude === filterValue);

  if (filtered.length === 0) {
    listEl.innerHTML = '<p class="text-center">ไม่พบรายการงานในหมวดนี้</p>';
    return;
  }

  listEl.innerHTML = filtered
    .map((product) => {
      const jobName = `${product.name}(${product.type} - ${product.Aptitude})`;
      const orderUrl = `order.html?job=${encodeURIComponent(
        jobName
      )}&price=${encodeURIComponent(product.price)}`;

      return `
        <article class="card">
          <div class="card__image-wrap">
            <img src="${escapeHtml(product.image)}" alt="${escapeHtml(
        jobName
      )}" loading="lazy">
          </div>
          <div class="card__body">
            <div class="card__type">${escapeHtml(product.type)}</div>
            <h3 class="card__title">${escapeHtml(product.name)}</h3>
            <span class="aptitude aptitude--${product.Aptitude.toLowerCase()}">${escapeHtml(
        product.Aptitude
      )}</span>
            <p class="card__desc">${escapeHtml(product.description || "")}</p>
            <div class="card__footer">
              <span class="card__price">${formatNumber(product.price)}</span>
              <a class="btn btn--solid" href="${orderUrl}">สมัคร</a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

/* ==========================================================
   2) order.html — ฟอร์มสั่งซื้อ / สมัคร
   ========================================================== */
function initOrderPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const job = urlParams.get("job") || "";
  const price = urlParams.get("price") || "";

  const jobEl = document.getElementById("job");
  const totalEl = document.getElementById("total");
  const itemsEl = document.getElementById("items");

  // เติมชื่องานลงช่อง job (ถ้ามี element นี้ในหน้า)
  // รองรับทั้งกรณีเป็น <input>/<textarea> (ใช้ .value) และ <span>/<div> อื่นๆ (ใช้ textContent)
  if (jobEl) {
    const isFormField = jobEl.tagName === "INPUT" || jobEl.tagName === "TEXTAREA";
    if (isFormField) {
      jobEl.value = job;
    } else {
      jobEl.textContent = job || "—";
    }
  }

  // เติมชื่องานลงช่อง items ด้วย (ใช้เป็นค่าที่จะถูกส่งไปเป็น payload.items)
  if (itemsEl) {
    itemsEl.value = job;
  }

  // สำคัญ: ต้องเติมราคาลงช่อง total เสมอ ห้ามเว้นว่าง
  if (totalEl) {
    totalEl.value = price;
  }

  const form = document.getElementById("orderForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    handleOrderSubmit(form);
  });
}

function handleOrderSubmit(form) {
  const getValue = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : "";
  };

  const payload = {
    customerName: getValue("customerName"),
    contact: getValue("contact"),
    items: getValue("items"),
    total: getValue("total"),
    note: getValue("note"),
  };

  const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
  }

  fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  })
    .then(() => {
      window.location.href = "thankyou.html";
    })
    .catch((error) => {
      console.error(error);
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      if (submitBtn) {
        submitBtn.disabled = false;
      }
    });
}

/* ==========================================================
   3) admin.html — ตารางออเดอร์จาก Google Sheet (CSV)
   ========================================================== */
function initAdminPage() {
  const tbody = document.querySelector("#ordersTable tbody");

  fetch(CSV_URL)
    .then((res) => {
      if (!res.ok) throw new Error("โหลดข้อมูลออเดอร์ไม่สำเร็จ");
      return res.text();
    })
    .then((csvText) => {
      const rows = parseCSV(csvText);
      if (rows.length <= 1) {
        tbody.innerHTML = '<tr><td colspan="6">ยังไม่มีรายการสั่งซื้อ</td></tr>';
        return;
      }

      // แถวแรกคือ header ตัดออก
      const dataRows = rows.slice(1).filter((r) => r.some((cell) => cell !== ""));

      // เรียงล่าสุดขึ้นก่อน โดยอิงคอลัมน์แรก (วันเวลา) ถ้า parse เป็นวันที่ได้
      dataRows.sort((a, b) => {
        const dateA = new Date(a[0]);
        const dateB = new Date(b[0]);
        const validA = !isNaN(dateA.getTime());
        const validB = !isNaN(dateB.getTime());
        if (validA && validB) return dateB - dateA;
        return 0;
      });
      if (!dataRows.some((r) => !isNaN(new Date(r[0]).getTime()))) {
        // ถ้า parse วันที่ไม่ได้เลย ให้กลับลำดับแถวแทน (ล่าสุดมักอยู่ท้ายชีท)
        dataRows.reverse();
      }

      tbody.innerHTML = dataRows
        .map((row) => {
          const [timestamp, customerName, contact, items, total, note] = row;
          return `
            <tr>
              <td>${escapeHtml(timestamp || "")}</td>
              <td>${escapeHtml(customerName || "")}</td>
              <td>${escapeHtml(contact || "")}</td>
              <td>${escapeHtml(items || "")}</td>
              <td>${escapeHtml(total || "")}</td>
              <td>${escapeHtml(note || "")}</td>
            </tr>
          `;
        })
        .join("");
    })
    .catch((err) => {
      console.error(err);
      tbody.innerHTML =
        '<tr><td colspan="6">ไม่สามารถโหลดข้อมูลออเดอร์ได้ในขณะนี้</td></tr>';
    });
}

// CSV parser แบบง่าย รองรับ field ที่ครอบด้วย double quote และ comma/newline ภายใน quote
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  // normalize line endings
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }
  }

  // แถวสุดท้ายที่ไม่มี newline ปิดท้าย
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

/* ==========================================================
   Utilities
   ========================================================== */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatNumber(num) {
  const n = Number(num);
  if (isNaN(n)) return `${num} บาท`;
  return `${n.toLocaleString("th-TH")} บาท`;
}
