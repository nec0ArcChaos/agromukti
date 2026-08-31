    </main>
</div>

<!-- SCRIPTS -->
<script>
function toggleSidebar() {
    var sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

function updateClock() {
    var now = new Date();
    var hours = String(now.getHours()).padStart(2, '0');
    var minutes = String(now.getMinutes()).padStart(2, '0');
    var seconds = String(now.getSeconds()).padStart(2, '0');
    var clockElem = document.getElementById('live-clock');
    if (clockElem) {
        clockElem.textContent = hours + ':' + minutes + ':' + seconds + ' WIB';
    }
}
setInterval(updateClock, 1000);
updateClock();

function openModal(id) {
    var modal = document.getElementById(id);
    if (modal) modal.classList.add('show');
}

function closeModal(id) {
    var modal = document.getElementById(id);
    if (modal) modal.classList.remove('show');
}

function filterTable(inputId, tableId) {
    var input = document.getElementById(inputId);
    var filter = input.value.toLowerCase();
    var table = document.getElementById(tableId);
    if (!table) return;
    var tr = table.getElementsByTagName('tr');

    for (var i = 1; i < tr.length; i++) {
        var tdText = tr[i].textContent || tr[i].innerText;
        if (tdText.toLowerCase().indexOf(filter) > -1) {
            tr[i].style.display = "";
        } else {
            tr[i].style.display = "none";
        }
    }
}
</script>
</body>
</html>
