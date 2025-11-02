document.addEventListener("DOMContentLoaded", async () => {
  // ✅ Navbar (shared for all pages)
  const navHTML = `
  <div class='max-w-6xl mx-auto flex justify-between items-center p-4'>
    <a href='home.html' class='text-xl font-bold text-cyan-400'>⚔️ Battle of Bytes</a>
    <div class='space-x-5 text-sm'>
      <a href='auction.html' class='hover:text-cyan-400'>Auction</a>
      <a href='poll.html' class='hover:text-cyan-400'>Poll</a>
      <a href='teams.html' class='hover:text-cyan-400'>Teams</a>
      <a href='coordinators.html' class='hover:text-cyan-400'>Coordinators</a>
      <a href='contact.html' class='hover:text-cyan-400'>Contact</a>
    </div>
  </div>`;
  document.querySelector(".navbar").innerHTML = navHTML;

  if (document.getElementById("auctionArea")) initAuction();
});

// ------------------------------------------
// Auction Logic
// ------------------------------------------

async function initAuction() {
  const baseUrl = "https://web-production-cbb0.up.railway.app";
  const area = document.getElementById("auctionArea");
  const timerEl = document.getElementById("timer");
  const purseBoard = document.getElementById("purseBoard");

  const teams = [
    "Byte Busters",
    "Ruby Renegades",
    "Java Jesters",
    "Code Commanders",
    "Syntax Samurai",
    "Data Mavericks",
    "Quantum Coders",
    "Logic Luminaries",
    "Python Pioneers"
  ];

  // Load players
  const res = await fetch("auctionData.json");
  const data = await res.json();

  let players = [];
  data.forEach(cat => {
    cat.students.forEach(st => {
      players.push({
        s_no: st.s_no,
        name: st.name,
        roll: st.roll_no,
        category: cat.category,
        skills: st.skills,
        current: 0,
        bidder: "—"
      });
    });
  });

  // ---------- RENDER PURSE SECTION ----------
  async function renderPurseBoard() {
    try {
      const res = await fetch(`${baseUrl}/getPurse`);
      const purses = await res.json();
      purseBoard.innerHTML = "";
      purses.forEach((p, i) => {
        purseBoard.innerHTML += `
          <div class='bg-gray-900/60 p-3 rounded-lg border border-cyan-400/30'>
            <p class='font-semibold text-cyan-300 text-sm'>${teams[i]}</p>
            <p class='text-green-400 text-xs mt-1'>₹${p.toLocaleString()}</p>
          </div>`;
      });
    } catch (err) {
      console.error("Error fetching purses:", err);
    }
  }

  setInterval(renderPurseBoard, 5000);
  renderPurseBoard();

  // ---------- SKILLS HELPER ----------
  function skillStars(skills) {
    return Object.entries(skills)
      .map(([s, v]) =>
        v
          ? `<div class='flex justify-between text-xs text-gray-300'>
               <span>${s}</span><span class='text-yellow-400'>${v}</span>
             </div>`
          : "")
      .join("");
  }

  async function fetchTeamForPlayer(id) {
    try {
      const res = await fetch(`${baseUrl}/getCurrentTeamOfPlayer?id=${id}`);
      return await res.text();
    } catch {
      return "—";
    }
  }

  async function fetchCurrentPrice(id) {
    try {
      const res = await fetch(`${baseUrl}/getCurrentPrice?id=${id}`);
      return await res.json();
    } catch {
      return 0;
    }
  }

  // ---------- TOAST FUNCTION ----------
  function showToast(message) {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = "toast";

    // format backend message nicely
    toast.innerHTML = message.replace(
      /^([^—]+)— current highest bid by (.+) at ₹(\d+)/,
      "<strong>$1</strong> — current highest bid by <span style='color:#22d3ee;'>$2</span> at ₹$3"
    );

    container.appendChild(toast);

    // auto-hide after 4s
    setTimeout(() => {
      toast.style.animation = "fadeOut 0.5s ease forwards";
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  }

  // ---------- RENDER PLAYERS ----------
  async function renderPlayers() {
    area.innerHTML = "";
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      p.current = await fetchCurrentPrice(p.s_no - 1);
      p.bidder = await fetchTeamForPlayer(p.s_no - 1);

      area.innerHTML += `
      <div class='bg-gray-800/50 p-5 rounded-xl border border-white/10 hover:border-cyan-400/40 hover:shadow-cyan-500/20 shadow-md transition'>
        <h3 class='text-lg font-semibold text-cyan-300 mb-1'>${p.name}</h3>
        <p class='text-sm text-gray-400 mb-1'>${p.roll}</p>
        <p class='text-xs text-gray-500 mb-2'>${p.category}</p>
        <div class='mb-2'>${skillStars(p.skills)}</div>
        <p class='text-green-400 mb-2'>Current: ₹${p.current} (${p.bidder})</p>

        <select id='team-${i}' class='input-box mb-2 text-black'>
          <option value=''>Select Team</option>
          ${teams.map((t, idx) => `<option value='${idx}'>${t}</option>`).join("")}
        </select>

        <input id='bid-${i}' type='number' placeholder='Enter bid amount' 
          class='input-box mb-2 text-black'>

        <button type="button" onclick='placeBid(${i})'
          class='w-full px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded'>
          Place Bid
        </button>
      </div>`;
    }

    // ✅ Disable all bid buttons if user is guest
    const loggedUser = localStorage.getItem("loggedUser");
    if (loggedUser === "guest") {
      document.querySelectorAll("button").forEach(btn => {
        btn.disabled = true;
        btn.classList.add("opacity-50", "cursor-not-allowed");
      });
    }
  }

  // ---------- PLACE BID ----------
  window.placeBid = async function (i) {
    const loggedUser = localStorage.getItem("loggedUser");

    // ✅ Restrict guest from bidding
    if (!loggedUser || loggedUser === "guest") {
      showToast("❌ Guests are not allowed to place bids. Please login as a team.");
      return;
    }

    const teamId = document.getElementById(`team-${i}`).value;
    const bid = parseInt(document.getElementById(`bid-${i}`).value);
    const player = players[i];

    if (teamId === "" || isNaN(bid)) {
      showToast("⚠️ Select team and enter a valid bid!");
      return;
    }

    if (bid <= player.current) {
      showToast("⚠️ Bid must be higher than current price!");
      return;
    }

    try {
      const res = await fetch(
        `${baseUrl}/updateCurrentPrice?id=${player.s_no - 1}&newPrice=${bid}&teamId=${teamId}`
      );
      const msg = await res.text(); // message from backend
      showToast(`✅ ${msg}`);
      await renderPlayers();
      await renderPurseBoard();
    } catch (err) {
      showToast("❌ Error placing bid!");
      console.error(err);
    }
  };

  // ---------- TIMER ----------
  function countdown() {
    const now = new Date();
    const target = new Date("2025-11-05T00:00:00+05:30");
    const diff = target - now;

    if (diff <= 0) {
      timerEl.textContent = "⏳ Auction Ended";
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    const secs = Math.floor((diff / 1000) % 60);

    timerEl.textContent = `⏰ Time Remaining: ${days}d ${hours}h ${mins}m ${secs}s`;
    requestAnimationFrame(countdown);
  }

  await renderPlayers();
  countdown();
}
