// how-it-works-crew.js

export function initHowItWorks() {
    // Evita di creare doppi modali se la funzione viene chiamata più volte
    if (document.getElementById('hiw-modal')) return;

    const modalHtml = `
        <div id="hiw-backdrop" class="fixed inset-0 bg-black/70 hidden z-[60] backdrop-blur-sm transition-opacity"></div>
        <div id="hiw-modal" class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-slate-800 border border-slate-600 rounded-xl shadow-2xl hidden z-[70] flex flex-col max-h-[90vh]">
            
            <div class="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800/80 rounded-t-xl">
                <h3 class="text-xl font-black text-white flex items-center gap-2">
                    <span>💡</span> Come funzionano gli Equipaggi
                </h3>
                <button id="hiw-close-top" class="text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-700">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <div class="p-6 overflow-y-auto space-y-5 text-slate-300 flex-1">
                <div class="bg-slate-900/60 p-4 rounded-lg border border-slate-700/50">
                    <h4 class="font-bold text-blue-400 mb-1 text-lg">1. Crea o Unisciti</h4>
                    <p class="text-sm leading-relaxed">Puoi creare un nuovo equipaggio selezionando l'imbarcazione (che determinerà il numero massimo di posti) oppure unirti a uno esistente inserendo il <strong>codice a 6 caratteri</strong> che ti ha fornito un tuo compagno.</p>
                </div>
                
                <div class="bg-green-900/20 p-4 rounded-lg border border-green-800/30">
                    <h4 class="font-bold text-green-400 mb-1 text-lg">2. Salva per tutti!</h4>
                    <p class="text-sm leading-relaxed">Il grande vantaggio degli equipaggi è che <strong>basta che un solo membro</strong> carichi l'allenamento nel Modulo Barca. Selezionando l'equipaggio, il lavoro verrà salvato automaticamente e contemporaneamente nello storico di <em>tutti i membri</em> della barca.</p>
                </div>
                
                <div class="bg-orange-900/20 p-4 rounded-lg border border-orange-800/30">
                    <h4 class="font-bold text-orange-400 mb-1 text-lg">3. Limiti e Regole</h4>
                    <ul class="list-disc list-inside text-sm space-y-2 mt-2">
                        <li>Puoi fare parte di massimo <strong>8 equipaggi</strong> attivi contemporaneamente.</li>
                        <li>Solo il <span class="text-slate-100 font-semibold">creatore</span> dell'equipaggio può rimuovere membri o eliminare il gruppo intero.</li>
                        <li>Gli altri membri possono decidere di uscire liberamente dal gruppo in qualsiasi momento.</li>
                    </ul>
                </div>
            </div>
            
            <div class="p-5 border-t border-slate-700 text-center bg-slate-800/80 rounded-b-xl">
                <button id="hiw-close-btn" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg">Ho capito</button>
            </div>
        </div>
    `;

    // Inietta l'HTML alla fine del body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Assegna gli eventi di chiusura
    const backdrop = document.getElementById('hiw-backdrop');
    const modal = document.getElementById('hiw-modal');
    
    const closeHiw = () => {
        backdrop.classList.add('hidden');
        modal.classList.add('hidden');
    };

    document.getElementById('hiw-close-top').addEventListener('click', closeHiw);
    document.getElementById('hiw-close-btn').addEventListener('click', closeHiw);
    backdrop.addEventListener('click', closeHiw);
}

export function openHowItWorks() {
    document.getElementById('hiw-backdrop').classList.remove('hidden');
    document.getElementById('hiw-modal').classList.remove('hidden');
}