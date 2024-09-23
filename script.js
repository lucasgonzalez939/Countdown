let db;  // IndexedDB database reference
let targetDate;  // Special target date stored globally
let customMessage = '';  // Custom message
let notes = {};  // To store notes

// Define preset values
const presetDate = new Date("2024-10-11T05:35:00");  // Preset date and time
const presetMessage = "¡¡Para que llegue Alana!!";    // Preset custom message

// Open IndexedDB
function openDatabase() {
    const request = indexedDB.open("countdownDB", 1);

    request.onupgradeneeded = function (event) {
        db = event.target.result;
        const objectStore = db.createObjectStore("notes", { keyPath: "date" });
        const dateStore = db.createObjectStore("targetDate", { keyPath: "id" });
    };

    request.onsuccess = function (event) {
        db = event.target.result;
        loadDataFromDB();
    };

    request.onerror = function (event) {
        console.error("Error opening IndexedDB", event);
    };
}

// Load target date and notes from IndexedDB
function loadDataFromDB() {
    const transaction = db.transaction(["targetDate"], "readonly");
    const dateStore = transaction.objectStore("targetDate");
    const request = dateStore.get(1);

    request.onsuccess = function (event) {
        if (event.target.result) {
            // Load saved data from IndexedDB
            targetDate = new Date(event.target.result.date);
            customMessage = event.target.result.message || '';
        } else {
            // No saved data, use preset values
            targetDate = presetDate;
            customMessage = presetMessage;
        }
        updateCountdown();
    };

    const notesTransaction = db.transaction(["notes"], "readonly");
    const notesStore = notesTransaction.objectStore("notes");

    notesStore.getAll().onsuccess = function (event) {
        const results = event.target.result;
        results.forEach(note => {
            notes[note.date] = note.content;
        });
        displayNotes();
    };
}

// Save target date and message to IndexedDB
function saveTargetDateToDB(date, message) {
    const transaction = db.transaction(["targetDate"], "readwrite");
    const dateStore = transaction.objectStore("targetDate");
    dateStore.put({ id: 1, date: date.toISOString(), message: message });
}

// Save note to IndexedDB
function saveNoteToDB(date, content) {
    const transaction = db.transaction(["notes"], "readwrite");
    const notesStore = transaction.objectStore("notes");
    notesStore.put({ date: date, content: content });
}

// Reset notes from IndexedDB
function resetNotesFromDB() {
    const transaction = db.transaction(["notes"], "readwrite");
    const notesStore = transaction.objectStore("notes");

    const clearRequest = notesStore.clear();

    clearRequest.onsuccess = function () {
        notes = {};  // Clear notes from memory
        displayNotes();  // Clear the displayed notes
        alert('Se han borrado las notas.');
    };
}

// Set a new special date and time when button is clicked
document.getElementById('set-date-time').addEventListener('click', function () {
    const inputDate = document.getElementById('special-date').value;
    const inputTime = document.getElementById('special-time').value;
    const inputMessage = document.getElementById('custom-message').value;

    if (inputDate && inputTime) {
        targetDate = new Date(`${inputDate}T${inputTime}`);
        customMessage = inputMessage; // Save the custom message
        saveTargetDateToDB(targetDate, customMessage);  // Save the date, time, and message to IndexedDB
        updateCountdown();  // Update the countdown and calendar with the new date and time

        document.getElementById('date-time-setter').classList.add('hidden'); // Hide the input form
    } else {
        alert("Por favor, seleciona fecha y hora");
    }
});

// Show the hidden div for setting date and time
document.getElementById('show-set-date-time').addEventListener('click', function () {
    document.getElementById('date-time-setter').classList.toggle('hidden');
});

// Function to update the countdown and the calendar
function updateCountdown() {
    const now = new Date();
    const timeDifference = targetDate.getTime() - now.getTime();

    const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

    const countdownElement = document.getElementById("countdown");
    countdownElement.innerHTML = `${days} Dias, ${hours} Horas, ${minutes} Minutos, ${seconds} Segundos<br>${customMessage}`;

    updateCalendar(now, targetDate);

    if (timeDifference < 0) {
        clearInterval(interval);
        countdownElement.innerHTML = "¡Ha llegado el momento!";
    }
}

// Function to create the calendar grid showing all days till the target date
function updateCalendar(startDate, endDate) {
    const calendarElement = document.getElementById("calendar");
    calendarElement.innerHTML = '';  // Clear the grid

    let currentMonth = startDate.getMonth();
    let currentYear = startDate.getFullYear();

    while (currentYear < endDate.getFullYear() || (currentYear === endDate.getFullYear() && currentMonth <= endDate.getMonth())) {
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

        const monthHeader = document.createElement('div');
        monthHeader.classList.add('month-header');
        monthHeader.textContent = `${new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' })} ${currentYear}`;
        calendarElement.appendChild(monthHeader);

        const monthGrid = document.createElement('div');
        monthGrid.classList.add('month-grid');
        monthGrid.style.gridTemplateColumns = `repeat(7, 50px)`;
        calendarElement.appendChild(monthGrid);

        // Add day names at the top of the calendar
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
        dayNames.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.classList.add('day-header');
            dayHeader.textContent = day;
            monthGrid.appendChild(dayHeader);
        });

        // Fill empty spaces for days before the first day of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('day', 'empty');
            monthGrid.appendChild(emptyCell);
        }

        // Fill in the days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.classList.add('day');
            dayElement.textContent = day;

            const dayDate = new Date(currentYear, currentMonth, day);

            if (dayDate >= startDate && dayDate <= endDate) {
                dayElement.classList.add('remaining');
            }

            dayElement.addEventListener('click', function () {
                const note = prompt(`Ingrese una nota para el ${dayDate.toDateString()}:`);
                if (note) {
                    const formattedDate = dayDate.toDateString();
                    notes[formattedDate] = note;
                    saveNoteToDB(formattedDate, note);
                    displayNotes();
                }
            });

            monthGrid.appendChild(dayElement);
        }

        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
    }
}

// Function to display the notes below the calendar
function displayNotes() {
    const notesListElement = document.getElementById('notes-list');
    notesListElement.innerHTML = ''; // Clear previous notes

    Object.keys(notes).forEach(date => {
        const noteElement = document.createElement('div');
        noteElement.classList.add('note');
        noteElement.innerHTML = `<strong>${date}</strong>: ${notes[date]}`;
        notesListElement.appendChild(noteElement);
    });
}

// Print notes
document.getElementById('print-notes').addEventListener('click', function () {
    const notesContent = Object.keys(notes).map(date => `${date}: ${notes[date]}`).join('\n');
    const newWindow = window.open('', '', 'width=600,height=400');
    newWindow.document.write('<pre>' + notesContent + '</pre>');
    newWindow.document.close();
    newWindow.print();
});

// Reset notes when button is clicked
document.getElementById('reset-notes').addEventListener('click', function () {
    if (confirm("¿Queres borrar las notas?")) {
        resetNotesFromDB();  // Clear notes from IndexedDB
    }
});

// Start countdown interval
const interval = setInterval(updateCountdown, 1000);

// Open the database and load data on page load
window.onload = openDatabase;
