// Sub-tab buttons (All / Done, All / Known) + level dropdown options.
window.subTabs=(tabs,active)=>`<div class="chips" style="margin:12px 0" role="tablist">${tabs.map(t=>`<button type="button" class="chip ${t.id===active?'on':''}" data-sub="${t.id}" role="tab">${t.label}</button>`).join('')}</div>`;
window.levelOptions=sel=>['N5','N4','N3','N2','N1'].map(l=>`<option ${sel===l?'selected':''}>${l}</option>`).join('');
