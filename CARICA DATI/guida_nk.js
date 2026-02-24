export function initGuidaModal() {
    // Questo è il codice HTML del popup della guida
    const modalHTML = `
        <div id="guidaModal" class="fixed inset-0 bg-slate-950/80 hidden z-[60] flex flex-col items-center justify-center p-4 backdrop-blur-sm transition-opacity">
            <div class="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                <div class="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                    <h2 class="text-lg font-bold text-sky-400 flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                            <path d="M10 8v8"></path>
                            <path d="M14 8v8"></path>
                            <path d="M6 12h12"></path>
                        </svg>
                        Guida Export NK LiNK
                    </h2>
                    <button id="closeGuidaBtn" class="text-slate-400 hover:text-white transition-colors text-2xl font-bold">&times;</button>
                </div>

                <div class="p-6 overflow-y-auto text-slate-300 space-y-5 text-sm">
                    <p>Per caricare i dati in automatico, devi esportare l'allenamento in formato <strong>.CSV</strong> dall'applicazione ufficiale dello SpeedCoach.</p>
                    
                    <ol class="list-decimal list-inside space-y-3 font-medium text-slate-200">
                        <li>Apri l'app <strong>LiNK Logbook</strong> sul telefono.</li>
                        <li>Sincronizza il tuo SpeedCoach via Bluetooth.</li>
                        <li>Entra nella sezione <strong>Logbook</strong> (il diario).</li>
                        <li>Tocca l'allenamento che vuoi caricare.</li>
                        <li>Tocca l'icona di <strong>Condivisione</strong> (in alto).</li>
                        <li>Seleziona <strong>Export to CSV</strong> <br><span class="text-xs text-red-400 ml-4">⚠️ ATTENZIONE: non scegliere .fit o .tcx!</span></li>
                        <li>Salva il file sul telefono (es. in "File" o "Download").</li>
                    </ol>

                    <div class="bg-sky-900/20 border border-sky-700/50 p-3 rounded-lg text-sky-200 mt-4 text-xs leading-relaxed">
                        💡 <strong>Suggerimento:</strong> Il file generato avrà un nome simile a <br><code class="text-sky-400">SpdCoach 2937010 20250205 0243PM.csv</code>. È questo il file che devi selezionare nella piattaforma.
                    </div>
                </div>

                <div class="p-4 border-t border-slate-700 bg-slate-800">
                    <button id="closeGuidaBtnFooter" class="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">Ho capito</button>
                </div>
            </div>
        </div>
    `;

    // Inietta l'HTML alla fine del body della pagina principale
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Recupera gli elementi
    const modal = document.getElementById('guidaModal');
    const btnOpen = document.getElementById('openGuidaBtn');
    const btnClose = document.getElementById('closeGuidaBtn');
    const btnCloseFooter = document.getElementById('closeGuidaBtnFooter');

    // Funzione per chiudere
    const closeModal = () => modal.classList.add('hidden');

    // Associa gli eventi ai pulsanti
    if (btnOpen) {
        btnOpen.addEventListener('click', (e) => {
            e.preventDefault(); // Evita che il form o la pagina ricarichi
            modal.classList.remove('hidden');
        });
    }
    
    btnClose.addEventListener('click', closeModal);
    btnCloseFooter.addEventListener('click', closeModal);
    
    // Chiudi anche se si clicca fuori dal popup (sullo sfondo scuro)
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}