document.addEventListener("DOMContentLoaded", () => {
    // --- Dados Mestres (Comuns a ambas as abas) ---
    const tecnicos = ["Alexandre", "Igor", "Wesley G", "Wesley L", "Eliceber", "Nivaldo", "Eduardo", "Warley", "Felipe", "Luan", "Leandro", "Eric"];
    const cidades = ["Mogi Guaçu", "Mogi Mirim", "Santo Antonio da Posse", "Martinho Prado", "Conchal", "Iracemapolis", "Limeira", "Estiva Gerbi"];
    const statusList = ["Finalizado", "Em andamento", "Ausente", "Reagendando"];

    // Tipos de OS específicos para cada aba
    const tiposOSManutencao = ["Manutenção", "Tarefa", "Configuração de Roteador", "Troca de Onu", "Não chega o Plano", "Segundo Ponto", "Sem conexão", "Cro atenuada", "CTO LOSS", "Manutenção Externa", "Troca de Roteador", "Led Vermelho", "Retirada de Equipamento", "Troca de Fonte", "Intermitência", "Troca de Cabo", "Troca de CV", "Repadronização Geral", "DB Fora de Padrão"];
    const tiposOSInstalacao = ["Instalação", "Mudança de Endereço"];

    // --- Elementos HTML Globais (Modais, Botões de Adicionar/Exportar) ---
    const osModal = document.getElementById("osModal");
    const addOsBtn = document.getElementById("addOsBtn");
    const closeModalBtn = document.getElementById("closeModal");
    const osForm = document.getElementById("osForm");
    const inputData = document.getElementById("osData");
    const inputHora = document.getElementById("osHora");
    const selectTecnicoForm = osForm.querySelector('select[name="tecnico"]');
    const selectCidadeForm = osForm.querySelector('select[name="cidade"]');
    const selectStatusForm = osForm.querySelector('select[name="status"]');
    const selectTipoForm = osForm.querySelector('select[name="tipo"]');

    const historyModal = document.getElementById("historyModal");
    const closeHistoryModalBtn = document.getElementById("closeHistoryModal");
    const historyEntriesContainer = document.getElementById("historyEntriesContainer");

    const exportBtn = document.getElementById("exportBtn");

    // --- Variáveis de Estado Global para Abas e Dados ---
    let activeTab = 'manutencao'; // 'manutencao' ou 'instalacao'
    let editingOsId = null; // Armazena o ID da O.S. que está sendo editada no modal
    let selectedOsRow = null; // Armazena a linha da O.S. selecionada na tabela

    // Dados de O.S. separados por tipo
    let osManutencaoEntries = JSON.parse(localStorage.getItem('osManutencaoEntries')) || [];
    let nextManutencaoOsId = parseInt(localStorage.getItem('nextManutencaoOsId')) || 1;

    let osInstalacaoEntries = JSON.parse(localStorage.getItem('osInstalacaoEntries')) || [];
    let nextInstalacaoOsId = parseInt(localStorage.getItem('nextInstalacaoOsId')) || 1;

    // --- Referências aos elementos das abas ---
    const manutencaoNavLink = document.getElementById("manutencaoNavLink");
    const instalacaoNavLink = document.getElementById("instalacaoNavLink");
    const manutencaoContent = document.getElementById("manutencaoContent");
    const instalacaoContent = document.getElementById("instalacaoContent");

    // --- Elementos de UI de Login/Logout ---
    const mainContent = document.getElementById("mainContent");
    const loginSection = document.getElementById("loginSection");
    const userNameDisplay = document.getElementById("userNameDisplay");
    const logoutButton = document.getElementById("logoutButton");

    // --- Funções de Ajuda ---

    // Preenche um select HTML com opções
    function preencherSelect(selectElement, optionsArray, placeholderText) {
        selectElement.innerHTML = `<option value="">${placeholderText}</option>`;
        optionsArray.forEach(optionValue => {
            const option = document.createElement("option");
            option.value = optionValue;
            option.textContent = optionValue;
            selectElement.appendChild(option);
        });
    }

    // Atualiza o relógio na interface
    function atualizarRelogio() {
        const now = new Date();
        const dia = String(now.getDate()).padStart(2, '0');
        const mes = String(now.getMonth() + 1).padStart(2, '0');
        const ano = now.getFullYear();
        const hora = String(now.getHours()).padStart(2, '0');
        const minuto = String(now.getMinutes()).padStart(2, '0');
        const segundo = String(now.getSeconds()).padStart(2, '0');
        const dateTimeElement = document.getElementById("currentDateTime");
        if (dateTimeElement) {
            dateTimeElement.textContent = `${dia}/${mes}/${ano} ${hora}:${minuto}:${segundo}`;
        }
    }
    setInterval(atualizarRelogio, 1000); // Atualiza a cada segundo
    atualizarRelogio(); // Chama uma vez para exibir imediatamente

    // Atualiza a data e hora do formulário para o momento atual
    function atualizarDataHoraAtualForm() {
        const now = new Date();
        inputData.value = now.toISOString().slice(0, 10); // Formato YYYY-MM-DD
        inputHora.value = now.toTimeString().slice(0, 5); // Formato HH:MM
    }

    // Retorna os dados da O.S. (entries e nextId) para a aba ativa
    function getActiveOsData() {
        if (activeTab === 'manutencao') {
            return {
                entries: osManutencaoEntries,
                nextId: nextManutencaoOsId,
                setEntries: (newEntries) => { osManutencaoEntries = newEntries; },
                setNextId: (newId) => { nextManutencaoOsId = newId; },
                save: () => {
                    localStorage.setItem('osManutencaoEntries', JSON.stringify(osManutencaoEntries));
                    localStorage.setItem('nextManutencaoOsId', nextManutencaoOsId);
                },
                tiposOS: tiposOSManutencao
            };
        } else { // 'instalacao'
            return {
                entries: osInstalacaoEntries,
                nextId: nextInstalacaoOsId,
                setEntries: (newEntries) => { osInstalacaoEntries = newEntries; },
                setNextId: (newId) => { nextInstalacaoOsId = newId; },
                save: () => {
                    localStorage.setItem('osInstalacaoEntries', JSON.stringify(osInstalacaoEntries));
                    localStorage.setItem('nextInstalacaoOsId', nextInstalacaoOsId);
                },
                tiposOS: tiposOSInstalacao
            };
        }
    }

    // Renderiza a tabela da aba ativa
    function renderTable() {
        const { entries } = getActiveOsData();
        const osTableBody = document.querySelector(`#osTable${capitalize(activeTab)} tbody`);
        osTableBody.innerHTML = ""; // Limpa a tabela

        // Obtém os valores atuais dos filtros
        const filterTecnico = document.getElementById(`filterTecnico${capitalize(activeTab)}`);
        const filterCidade = document.getElementById(`filterCidade${capitalize(activeTab)}`);
        const filterStatus = document.getElementById(`filterStatus${capitalize(activeTab)}`);
        const filterData = document.getElementById(`filterData${capitalize(activeTab)}`);

        const tecnicoFiltro = filterTecnico.value.trim().toLowerCase();
        const statusFiltro = filterStatus.value.trim().toLowerCase();
        const cidadeFiltro = filterCidade.value.trim().toLowerCase();
        const dataFiltroValue = filterData.value;

        const filteredOs = entries.filter(os => {
            const dataOnly = os.dataHora.split(" ")[0]; // Pega apenas a data (YYYY-MM-DD)
            const tecnico = os.tecnico.trim().toLowerCase();
            const cidade = os.cidade.trim().toLowerCase();
            const status = os.status.trim().toLowerCase();

            const passaTecnico = tecnicoFiltro === "" || tecnico === tecnicoFiltro;
            const passaStatus = statusFiltro === "" || status === statusFiltro;
            const passaCidade = cidadeFiltro === "" || cidade === cidadeFiltro;
            const passaData = dataFiltroValue === "" || dataOnly === dataFiltroValue;

            return passaTecnico && passaStatus && passaCidade && passaData;
        });

        filteredOs.forEach(os => {
            const tr = document.createElement("tr");
            tr.dataset.osId = os.id;
            tr.classList.add('selectable-row'); // Para o estilo de seleção

            // Adicione data-label para responsividade da tabela (CSS @media)
            tr.innerHTML = `
                <td data-label="Data/Hora">${os.dataHora}</td>
                <td data-label="ID Cliente">${os.idCliente}</td>
                <td data-label="Nome">${os.nome}</td>
                <td data-label="Cidade">${os.cidade}</td>
                <td data-label="Rua">${os.rua}</td>
                <td data-label="Bairro">${os.bairro}</td>
                <td data-label="Tipo">${os.tipo}</td>
                <td data-label="Técnico">${os.tecnico}</td>
                <td data-label="Status">${os.status}</td>
                <td data-label="Obs">${os.obs}</td>
            `;
            osTableBody.appendChild(tr);
        });

        resetSelection(); // Garante que não haja nada selecionado após renderizar
    }

    // Gerencia a seleção de linhas na tabela
    function handleRowClick(e) {
        const clickedRow = e.target.closest("tr");
        if (!clickedRow || !clickedRow.classList.contains('selectable-row')) return; // Garante que é uma linha de OS clicável

        const osActionsPanel = document.getElementById(`osActionsPanel${capitalize(activeTab)}`);
        const selectedOsInfo = document.getElementById(`selectedOsInfo${capitalize(activeTab)}`);

        // Remove a seleção da linha anterior, se houver
        if (selectedOsRow) {
            selectedOsRow.classList.remove('selected');
        }

        // Se a linha clicada já estava selecionada, desseleciona tudo
        if (selectedOsRow === clickedRow) {
            selectedOsRow = null;
            editingOsId = null;
            osActionsPanel.classList.add("hidden");
            selectedOsInfo.textContent = "Nenhuma O.S. selecionada";
        } else {
            // Seleciona a nova linha
            selectedOsRow = clickedRow;
            selectedOsRow.classList.add('selected');
            editingOsId = parseInt(selectedOsRow.dataset.osId);

            const { entries } = getActiveOsData();
            const os = entries.find(entry => entry.id === editingOsId);
            if (os) {
                selectedOsInfo.textContent = `${os.nome} (ID: ${os.idCliente})`;
                osActionsPanel.classList.remove("hidden");
            }
        }
    }

    // Preenche o modal de edição com os dados da OS selecionada
    function editSelectedOs() {
        if (!editingOsId) return;
        const { entries, tiposOS } = getActiveOsData();
        const os = entries.find(entry => entry.id === editingOsId);

        if (os) {
            const dataHoraParts = os.dataHora.split(" ");
            inputData.value = dataHoraParts[0];
            inputHora.value = dataHoraParts[1];
            osForm.elements.idCliente.value = os.idCliente;
            osForm.elements.nome.value = os.nome;
            osForm.elements.rua.value = os.rua;
            osForm.elements.bairro.value = os.bairro;
            osForm.elements.obs.value = os.obs;

            // Preenche os selects do FORMULÁRIO (modal) antes de tentar setar o valor
            preencherSelect(selectCidadeForm, cidades, "Selecione Cidade");
            selectCidadeForm.value = os.cidade;

            preencherSelect(selectTipoForm, tiposOS, "Tipo O.S");
            selectTipoForm.value = os.tipo;

            preencherSelect(selectTecnicoForm, tecnicos, "Selecione Técnico");
            selectTecnicoForm.value = os.tecnico;

            preencherSelect(selectStatusForm, statusList, "Status");
            selectStatusForm.value = os.status;

            osModal.classList.remove("hidden");
        }
    }

    // Exclui a OS selecionada
    function deleteSelectedOs() {
        if (!editingOsId) return;
        if (confirm("Tem certeza que deseja excluir esta O.S.?")) {
            const activeData = getActiveOsData();
            let updatedEntries = activeData.entries.filter(entry => entry.id !== editingOsId);

            activeData.setEntries(updatedEntries);
            activeData.save();

            renderTable();
            resetSelection();
        }
    }

    // Exibe o histórico da OS selecionada
    function showOsHistory() {
        if (!editingOsId) return;
        const { entries } = getActiveOsData();
        const os = entries.find(entry => entry.id === editingOsId);

        historyEntriesContainer.innerHTML = ""; // Limpa antes de preencher

        if (os && os.history && os.history.length > 0) {
            os.history.slice().reverse().forEach(entry => {
                const historyEntryDiv = document.createElement("div");
                historyEntryDiv.classList.add("history-entry");

                const avatarLetter = entry.user ? entry.user.charAt(0).toUpperCase() : '?';
                const avatarDiv = `<div class="history-avatar">${avatarLetter}</div>`;

                historyEntryDiv.innerHTML = `
                    ${avatarDiv}
                    <div class="history-details">
                        <div class="history-user-info">
                            <span>${entry.user}</span>
                            <span class="history-timestamp">${entry.timestamp}</span>
                        </div>
                        <p class="history-action">${entry.action}</p>
                    </div>
                `;
                historyEntriesContainer.appendChild(historyEntryDiv);
            });
        } else {
            historyEntriesContainer.innerHTML = "<p>Nenhum histórico de edição encontrado para esta O.S.</p>";
        }
        historyModal.classList.remove("hidden");
    }

    // Reseta a seleção atual na tabela e esconde o painel de ações
    function resetSelection() {
        if (selectedOsRow) {
            selectedOsRow.classList.remove('selected');
        }
        selectedOsRow = null;
        editingOsId = null;
        // Esconde o painel de ações da aba ativa
        const osActionsPanel = document.getElementById(`osActionsPanel${capitalize(activeTab)}`);
        osActionsPanel.classList.add("hidden");
        const selectedOsInfo = document.getElementById(`selectedOsInfo${capitalize(activeTab)}`);
        selectedOsInfo.textContent = "Nenhuma O.S. selecionada";
    }

    // Função auxiliar para capitalizar a primeira letra
    function capitalize(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    // --- Lógica de Navegação entre Abas ---
    function activateTab(tabName) {
        // 1. Remove 'active' de TODOS os links de navegação E adiciona 'hidden' a TODOS os conteúdos
        manutencaoNavLink.classList.remove('active');
        instalacaoNavLink.classList.remove('active');

        manutencaoContent.classList.add('hidden'); // Oculta
        manutencaoContent.classList.remove('active'); // Remove 'active' do conteúdo também
        instalacaoContent.classList.add('hidden'); // Oculta
        instalacaoContent.classList.remove('active'); // Remove 'active' do conteúdo também

        // 2. Ativa o link de navegação e mostra o conteúdo correto
        if (tabName === 'manutencao') {
            manutencaoNavLink.classList.add('active');
            manutencaoContent.classList.remove('hidden'); // Revela
            manutencaoContent.classList.add('active');     // Adiciona 'active' (para o CSS)
        } else if (tabName === 'instalacao') {
            instalacaoNavLink.classList.add('active');
            instalacaoContent.classList.remove('hidden'); // Revela
            instalacaoContent.classList.add('active');     // Adiciona 'active' (para o CSS)
        }
        activeTab = tabName; // Atualiza a aba ativa

        // **** PREENCHE E RESETA OS FILTROS APENAS AQUI, NA TROCA DE ABA ****
        const currentFilterTecnico = document.getElementById(`filterTecnico${capitalize(activeTab)}`);
        const currentFilterCidade = document.getElementById(`filterCidade${capitalize(activeTab)}`);
        const currentFilterStatus = document.getElementById(`filterStatus${capitalize(activeTab)}`);
        const currentFilterData = document.getElementById(`filterData${capitalize(activeTab)}`);

        preencherSelect(currentFilterTecnico, tecnicos, "Todos Técnicos");
        preencherSelect(currentFilterCidade, cidades, "Todas Cidades");
        preencherSelect(currentFilterStatus, statusList, "Todos Status");
        currentFilterData.value = ""; // Limpa o filtro de data

        renderTable(); // Renderiza a tabela da aba recém-ativada COM OS FILTROS RESETADOS INICIALMENTE

        // Esconde modais abertos ao trocar de aba
        osModal.classList.add('hidden');
        historyModal.classList.add('hidden');
        osForm.reset();
        resetSelection(); // Garante que nenhuma OS esteja selecionada ao trocar de aba
    }

    // --- Event Listeners Globais ---

    // Listeners para os links de navegação
    manutencaoNavLink.addEventListener("click", (e) => {
        e.preventDefault();
        activateTab('manutencao');
    });
    instalacaoNavLink.addEventListener("click", (e) => {
        e.preventDefault();
        activateTab('instalacao');
    });

    // Listeners para os selects de filtro (agora apenas chamam renderTable)
    document.getElementById("filterTecnicoManutencao").addEventListener("change", renderTable);
    document.getElementById("filterCidadeManutencao").addEventListener("change", renderTable);
    document.getElementById("filterStatusManutencao").addEventListener("change", renderTable);
    document.getElementById("filterDataManutencao").addEventListener("change", renderTable);
    document.getElementById("applyFiltersManutencao").addEventListener("click", renderTable); // Botão "Aplicar Filtros"

    document.getElementById("filterTecnicoInstalacao").addEventListener("change", renderTable);
    document.getElementById("filterCidadeInstalacao").addEventListener("change", renderTable);
    document.getElementById("filterStatusInstalacao").addEventListener("change", renderTable);
    document.getElementById("filterDataInstalacao").addEventListener("change", renderTable);
    document.getElementById("applyFiltersInstalacao").addEventListener("click", renderTable); // Botão "Aplicar Filtros"


    // Listeners para o clique nas linhas da tabela (delegando)
    document.querySelector('#osTableManutencao tbody').addEventListener("click", handleRowClick);
    document.querySelector('#osTableInstalacao tbody').addEventListener("click", handleRowClick);

    // Listeners para os botões de ação de cada aba (Editar, Excluir, Histórico)
    document.getElementById('editSelectedOsBtnManutencao').addEventListener("click", editSelectedOs);
    document.getElementById('deleteSelectedOsBtnManutencao').addEventListener("click", deleteSelectedOs);
    document.getElementById('historySelectedOsBtnManutencao').addEventListener("click", showOsHistory);

    document.getElementById('editSelectedOsBtnInstalacao').addEventListener("click", editSelectedOs);
    document.getElementById('deleteSelectedOsBtnInstalacao').addEventListener("click", deleteSelectedOs);
    document.getElementById('historySelectedOsBtnInstalacao').addEventListener("click", showOsHistory);


    // Botão de adicionar nova O.S. (comum para ambas as abas)
    addOsBtn.addEventListener("click", (e) => {
        e.preventDefault();
        editingOsId = null; // Garante que é uma nova O.S.
        osForm.reset(); // Limpa o formulário
        atualizarDataHoraAtualForm(); // Preenche com data/hora atual

        // Preenche os selects do FORMULÁRIO (modal)
        const { tiposOS } = getActiveOsData();
        preencherSelect(selectTipoForm, tiposOS, "Tipo O.S");
        preencherSelect(selectTecnicoForm, tecnicos, "Selecione Técnico");
        preencherSelect(selectCidadeForm, cidades, "Selecione Cidade");
        preencherSelect(selectStatusForm, statusList, "Status");

        osModal.classList.remove("hidden"); // Mostra o modal
        resetSelection(); // Reseta a seleção atual para evitar conflitos
    });

    closeModalBtn.addEventListener("click", () => {
        osModal.classList.add("hidden");
        osForm.reset();
        editingOsId = null; // Zera o ID de edição
    });

    closeHistoryModalBtn.addEventListener("click", () => {
        historyModal.classList.add("hidden");
    });

    // Submissão do formulário
    osForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const formData = new FormData(osForm);
        const newData = {
            data: formData.get("data"),
            hora: formData.get("hora"),
            idCliente: formData.get("idCliente"),
            nome: formData.get("nome"),
            cidade: formData.get("cidade"),
            rua: formData.get("rua"),
            bairro: formData.get("bairro"),
            tipo: formData.get("tipo"),
            tecnico: formData.get("tecnico"),
            status: formData.get("status"),
            obs: formData.get("obs"),
        };
        const currentTimestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const loggedInUser = JSON.parse(sessionStorage.getItem("usuarioLogado"));
        const currentUser = loggedInUser ? loggedInUser.email : "Desconhecido"; // Use o email do usuário logado

        const activeData = getActiveOsData();
        let currentEntries = activeData.entries; // Referência ao array atual
        let currentNextId = activeData.nextId;

        if (editingOsId !== null) {
            // Lógica de Edição
            const osIndex = currentEntries.findIndex(os => os.id === editingOsId);
            if (osIndex !== -1) {
                const oldOs = { ...currentEntries[osIndex] }; // Copia a OS antiga
                let changedFields = [];

                // Verifica campos alterados, excluindo 'data' e 'hora' pois serão concatenados em 'dataHora'
                for (const key in newData) {
                    if (key !== 'data' && key !== 'hora' && newData[key] !== oldOs[key]) {
                        changedFields.push(`'${key}' de '${oldOs[key]}' para '${newData[key]}'`);
                    }
                }
                const newDateTime = `${newData.data} ${newData.hora}`;
                if (newDateTime !== oldOs.dataHora) {
                    changedFields.push(`'Data/Hora' de '${oldOs.dataHora}' para '${newDateTime}'`);
                }

                if (changedFields.length > 0) {
                    const historyEntry = {
                        timestamp: currentTimestamp,
                        user: currentUser,
                        action: `Editado: ${changedFields.join("; ")}`,
                    };
                    // Garante que o array history exista
                    if (!currentEntries[osIndex].history) {
                        currentEntries[osIndex].history = [];
                    }
                    currentEntries[osIndex].history.push(historyEntry);
                }
                // Atualiza a OS existente no array
                Object.assign(currentEntries[osIndex], { ...newData, dataHora: newDateTime });
            }
        } else {
            // Lógica de Nova O.S.
            const newOs = {
                id: currentNextId++,
                dataHora: `${newData.data} ${newData.hora}`,
                ...newData,
                history: [ // Sempre inicia com um registro no histórico
                    {
                        timestamp: currentTimestamp,
                        user: currentUser,
                        action: `Adicionado: O.S. para ${newData.nome} (ID: ${newData.idCliente})`,
                    }
                ]
            };
            currentEntries.push(newOs);
        }

        activeData.setNextId(currentNextId); // Apenas o nextId pode ter mudado
        activeData.save(); // Salva o estado atualizado do array no localStorage

        renderTable();
        osForm.reset();
        osModal.classList.add("hidden");
        editingOsId = null;
        resetSelection();
    });

    // Listener global para resetar a seleção ao clicar fora da tabela ou modais
    document.addEventListener("click", (e) => {
        const clickedNavLink = e.target.closest(".nav-link");
        const clickedNavButton = e.target.closest(".nav-button");

        // Se clicou em um link de navegação ou botão de navegação, não reseta a seleção
        if (clickedNavLink || clickedNavButton) {
            return;
        }

        const clickedInsideTableManutencao = e.target.closest("#osTableManutencao");
        const clickedInsideTableInstalacao = e.target.closest("#osTableInstalacao");
        const clickedInsideActionsPanelManutencao = e.target.closest("#osActionsPanelManutencao");
        const clickedInsideActionsPanelInstalacao = e.target.closest("#osActionsPanelInstalacao");
        const clickedInsideModal = e.target.closest("#osModal") || e.target.closest("#historyModal");
        const clickedInsideLoginSection = e.target.closest("#loginSection"); // Não resetar se clicou na área de login

        if (!clickedInsideTableManutencao && !clickedInsideTableInstalacao &&
            !clickedInsideActionsPanelManutencao && !clickedInsideActionsPanelInstalacao &&
            !clickedInsideModal && !clickedInsideLoginSection) {
            resetSelection();
        }
    });

    // --- Exportar Relatório PDF (Adapta-se à aba ativa) ---
    exportBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const { entries } = getActiveOsData();
        exportarTabelaPDF(entries, activeTab);
    });

    // Função global para exportação (agora recebe os dados e o tipo)
    function exportarTabelaPDF(osEntriesToExport, osType) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const linhas = osEntriesToExport || [];
        const contadorPorTecnicoCidade = {};

        // Contabiliza apenas OS finalizadas, agrupando por técnico e depois por cidade
        linhas.forEach(os => {
            const status = os.status.trim().toLowerCase();
            if (status === "finalizado") {
                const tecnico = os.tecnico.trim();
                const cidade = os.cidade.trim();

                if (!contadorPorTecnicoCidade[tecnico]) {
                    contadorPorTecnicoCidade[tecnico] = {};
                }
                if (!contadorPorTecnicoCidade[tecnico][cidade]) {
                    contadorPorTecnicoCidade[tecnico][cidade] = 0;
                }
                contadorPorTecnicoCidade[tecnico][cidade]++;
            }
        });

        // Prepara os dados para a tabela
        const dadosTabela = [];
        const tecnicosOrdenados = Object.keys(contadorPorTecnicoCidade).sort();

        // Se não houver dados para exportar após o filtro
        if (tecnicosOrdenados.length === 0) {
            alert(`Nenhuma O.S. de ${osType === 'manutencao' ? 'Manutenção' : 'Instalação'} finalizada encontrada para exportar.`);
            return;
        }

        tecnicosOrdenados.forEach(tecnico => {
            const cidadesDoTecnico = Object.keys(contadorPorTecnicoCidade[tecnico]).sort();
            cidadesDoTecnico.forEach(cidade => {
                const quantidade = contadorPorTecnicoCidade[tecnico][cidade];
                dadosTabela.push([tecnico, cidade, quantidade]);
            });
        });
        
        // Verificação adicional caso dadosTabela fique vazio após processamento
        if (dadosTabela.length === 0) {
            alert(`Nenhuma O.S. de ${osType === 'manutencao' ? 'Manutenção' : 'Instalação'} finalizada encontrada para exportar.`);
            return;
        }

        doc.setFontSize(14);
        doc.text(`Relatório de O.S. de ${osType === 'manutencao' ? 'Manutenção' : 'Instalação'} Finalizadas por Técnico e Cidade`, 14, 15);
        doc.autoTable({
            head: [["Técnico", "Cidade", "O.S. Finalizadas"]],
            body: dadosTabela,
            startY: 20,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [46, 204, 113] },
            margin: { top: 10 }
        });

        const now = new Date();
        const dia = String(now.getDate()).padStart(2, '0');
        const mes = String(now.getMonth() + 1).padStart(2, '0');
        const ano = now.getFullYear();
        const hora = String(now.getHours()).padStart(2, '0');
        const minuto = String(now.getMinutes()).padStart(2, '0');
        const timestamp = `${dia}-${mes}-${ano}_${hora}-${minuto}`;

        doc.save(`relatorio-${osType}-finalizados-por-tecnico-cidade-${timestamp}.pdf`);
    }

    // --- Lógica de Autenticação com Google e Controle de Acesso ---
    // Esta função é chamada automaticamente pelo SDK do Google após o login
    window.handleCredentialResponse = function(response) {
        const jwt = response.credential;
        const payload = JSON.parse(atob(jwt.split('.')[1]));

        console.log("Dados do token do Google:", payload);

        const userName = payload.name;
        const userEmail = payload.email;

        // Armazenar informações do usuário no sessionStorage
        sessionStorage.setItem("usuarioLogado", JSON.stringify({ name: userName, email: userEmail }));

        alert(`Bem-vindo, ${userName} (${userEmail})!`);

        // Recarregar a página para aplicar o estado de login
        location.reload();
    };

    // Lógica executada ao carregar a página (e após um refresh)
    const checkLoginStatus = () => {
        const usuarioLogado = JSON.parse(sessionStorage.getItem("usuarioLogado"));

        if (!usuarioLogado) {
            // Se não houver usuário logado, mostra a seção de login e oculta o conteúdo principal
            if (loginSection) loginSection.classList.remove("hidden");
            if (mainContent) mainContent.classList.add("hidden");
            if (userNameDisplay) userNameDisplay.textContent = "Faça login";
            if (logoutButton) logoutButton.classList.add("hidden"); // Esconde o botão de logout
            console.log("Acesso restrito. Por favor, faça login com Google.");
        } else {
            // Se houver usuário logado, oculta a seção de login e mostra o conteúdo principal
            if (loginSection) loginSection.classList.add("hidden");
            if (mainContent) mainContent.classList.remove("hidden");
            if (userNameDisplay) userNameDisplay.textContent = `Usuário: ${usuarioLogado.name}`;
            if (logoutButton) logoutButton.classList.remove("hidden"); // Mostra o botão de logout
            console.log(`Usuário logado: ${usuarioLogado.name} - ${usuarioLogado.email}`);
            
            // Ativa a aba de Manutenção por padrão apenas se o usuário estiver logado
            activateTab('manutencao');
        }
    };

    // Adiciona o listener para o botão de logout
    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            sessionStorage.removeItem("usuarioLogado"); // Remove os dados do usuário
            // Opcional: Deslogar do Google Identity Services se usar One Tap
            if (window.google && window.google.accounts && window.google.accounts.id) {
                 window.google.accounts.id.disableAutoSelect(); // Para desabilitar o "One Tap" em futuras visitas
            }
            alert("Você foi desconectado.");
            location.reload(); // Recarrega para mostrar a tela de login
        });
    }

    // Chama a verificação de status de login ao carregar a DOM
    checkLoginStatus();
});

//novo//
// Decodifica o JWT recebido do Google
function decodeJwtResponse(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));

  return JSON.parse(jsonPayload);
}

// Função de callback do login Google
function handleCredentialResponse(response) {
  const userData = decodeJwtResponse(response.credential);

  // Mostra nome e email do usuário
  const userEmailSpan = document.getElementById('userEmail');
  userEmailSpan.textContent = `${userData.name} (${userData.email})`;

  // Mostra área do usuário e botão sair
  document.getElementById('userInfo').style.display = 'block';

  // Esconde botão de login
  document.querySelector('.g_id_signin').style.display = 'none';

  // Salva sessão (opcional)
  localStorage.setItem('userName', userData.name);
  localStorage.setItem('userEmail', userData.email);
}

// Ao carregar a página, verifica se já está logado
window.addEventListener('DOMContentLoaded', () => {
  const name = localStorage.getItem('userName');
  const email = localStorage.getItem('userEmail');

  if (name && email) {
    document.getElementById('userEmail').textContent = `${name} (${email})`;
    document.getElementById('userInfo').style.display = 'block';
    document.querySelector('.g_id_signin').style.display = 'none';
  }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  // Esconde área do usuário
  document.getElementById('userInfo').style.display = 'none';

  // Esvazia texto
  document.getElementById('userEmail').textContent = '';

  // Mostra login do Google
  document.querySelector('.g_id_signin').style.display = 'block';

  // Limpa sessão
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');

  // Remove login automático do Google
  google.accounts.id.disableAutoSelect();
});
