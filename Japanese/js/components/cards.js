// Shared card builders: lesson shell, empty states, search rows.
window.emptyCard=msg=>`<div class="card"><p class="mut">${msg}</p></div>`;
window.searchRow=(id,ph)=>`<div class="row"><input id="${id}" placeholder="${ph}" autocomplete="off"></div>`;
window.historyRow=h=>`<div class="lesson"><div class="en">“${h.q}”</div><div class="jp" style="font-weight:800">${h.top||''}</div><div class="mut">${new Date(h.at).toLocaleString()}</div></div>`;
