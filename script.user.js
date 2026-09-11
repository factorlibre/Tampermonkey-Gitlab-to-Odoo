// ==UserScript==
// @name         Gitlab To Odoo
// @namespace    http://tampermonkey.net/
// @version      2026-09-11.2
// @description  Abre la tarea de Gextia correspondiente a la issue/MR de GitLab
// @author       Factor Libre - Jesús Lorenzo
// @include      https://git.*.com/*
// @include      https://*.gitlab.*/*
// @icon         https://gextia.com/wp-content/uploads/2025/01/gextia-favicon-150x150.png
// @require      https://raw.githubusercontent.com/Zarritas/tm-framework/main/dist/tm-gitlab-dom.js
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @updateURL    https://github.com/factorlibre/Tampermonkey-Gitlab-to-Odoo/raw/refs/heads/main/script.user.js
// @downloadURL  https://github.com/factorlibre/Tampermonkey-Gitlab-to-Odoo/raw/refs/heads/main/script.user.js
// ==/UserScript==

(function() {
    'use strict';

    const BUTTON_ID = 'gl-to-gextia-btn';
    const ICON_URL = 'https://gextia.com/wp-content/uploads/2025/01/gextia-favicon-150x150.png';

    // Todos los selectores de GitLab viven en TMGitLabDOM (tm-framework):
    // desde GitLab 18.x las issues usan la vista "work item" y los MRs siguen
    // con el sidebar clásico, así que cada lookup depende del layout.
    if (!globalThis.TMGitLabDOM) {
        console.error('[Gitlab To Odoo] TMGitLabDOM no se ha cargado. Revisa el @require.');
        return;
    }

    const DOM = globalThis.TMGitLabDOM;

    function setOdooUrl(){
        const new_url = prompt("¿Cual es la url a conectar? Ej.: 'https://gextia.tu-empresa.com'")
        if (new_url){
            GM_setValue('odoo_url', new_url)
        }else{
            GM_setValue('odoo_url',GM_getValue('odoo_url',''))
        }
    }

    function abrirEnGextia(event) {
        if (event.altKey){
            setOdooUrl()
        }else{
            const url = window.location.href;
            window.open(GM_getValue('odoo_url','')+"/gitlab/go-to-task?incoming_url=" + url);
        }
    }

    // Preferencia de si el botón muestra su texto o sólo el icono, alternable
    // desde el menú de Tampermonkey.
    const LABELS_KEY = 'tm_button_labels';
    let menuId = null;

    function registrarMenu() {
        if (typeof GM_registerMenuCommand !== 'function') return;

        // Re-registrar para que el texto del menú refleje el estado actual.
        if (menuId !== null && typeof GM_unregisterMenuCommand === 'function') {
            GM_unregisterMenuCommand(menuId);
        }

        menuId = GM_registerMenuCommand(
            DOM.areButtonLabelsVisible()
                ? 'Ocultar texto de los botones'
                : 'Mostrar texto de los botones',
            () => aplicarEtiquetas(!DOM.areButtonLabelsVisible())
        );
    }

    function aplicarEtiquetas(visible) {
        GM_setValue(LABELS_KEY, DOM.setButtonLabels(visible));
        registrarMenu();
    }

    DOM.setButtonLabels(GM_getValue(LABELS_KEY, true));
    registrarMenu();

    // GitLab 18.x renderiza las issues como una app Vue: no hay "load" al
    // navegar de una tarea a otra, y el header se vuelve a pintar solo
    // tirándose el botón por delante. onPage cubre ambos casos y el guard
    // evita duplicarlo.
    DOM.onPage(() => {
        if (!GM_getValue('odoo_url','')?.startsWith('https://')){
            setOdooUrl()
        }

        DOM.injectButton({
            id: BUTTON_ID,
            text: 'Abrir en Gextia',
            iconUrl: ICON_URL,
            title: 'Abrir la tarea en Gextia (Alt+click para cambiar la URL)',
            // Junto al botón Edit, y también en el header condensado que
            // GitLab saca al hacer scroll hacia arriba (esa copia es
            // BUTTON_ID--sticky).
            placement: 'header',
            onClick: abrirEnGextia
        });
    }, {
        guard: BUTTON_ID,
        match: ctx => ctx.type === 'issue' || ctx.type === 'merge_request'
    });
})();
