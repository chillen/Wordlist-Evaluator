
var trials = []
var trialHistory = []
var wordlists = []
var currentTrial = null
var session = Math.random().toString(36).substring(7) // Random enough session key
var highlightedIndex = 0
var issueLabels = ['U', 'S', 'O', 'D', 'R', 'Oth']
var highlightedDiv = ''

document.addEventListener('DOMContentLoaded', function () {
    setupListeners()
    populateWordlists(true).then(wordlists => {
        let wordlist = selectWordList()
        currentTrial = new Trial(wordlist)
        displaySeed(wordlist.seed)
        displayList(wordlist)
        changeHighlighted()
    }).catch(err => console.log(err))
})

function setupListeners() {
    document.addEventListener('keyup', function (e) {
        if (e.keyCode === 38) { // Up arrow
          e.preventDefault()
          highlightedIndex -= 1
          if (highlightedIndex < 0) highlightedIndex = 9
          changeHighlighted()
        }
        if (e.keyCode === 40) { // Down arrow
          e.preventDefault()
          highlightedIndex = (highlightedIndex+1) % 10
          changeHighlighted()
        }

        if (e.keyCode >= 49 && e.keyCode <= 54) {
            // Number keys, 1 == 49, 
            let pressed = 6-(55 - e.keyCode)
            toggleButton(pressed)
        }
      })
}

function changeHighlighted() {
    console.log(highlightedIndex)
    let newDiv = document.querySelectorAll('li.wordlist-word')[highlightedIndex]

    if (highlightedDiv === '') {
        highlightedDiv = newDiv
        highlightedDiv.classList.toggle('highlighted')
    }
    highlightedDiv.classList.toggle('highlighted')
    newDiv.classList.toggle('highlighted')
    highlightedDiv = newDiv
}

function toggleButton(number) {
    highlightedDiv.querySelectorAll('button.issue')[number].click()
}

function selectIssue(word, issue) {
    document.querySelector(`button#${word}-${issue}`).classList.toggle('selected')
    currentTrial.toggle(word, issue)
}

function displayList(wordlist) {
    document.querySelector("#wordlist").innerHTML = wordlist.toHTML()
}

function displaySeed(seed) {
    document.querySelector("#seed-word").innerHTML = seed
}

function next() {
    let wordlist = selectWordList()
    trials.push(currentTrial)
    currentTrial = new Trial(wordlist)
    displaySeed(wordlist.seed)
    displayList(wordlist)
}

function selectWordList() {
    // In this system, we want to go through each list once
    // so shift, get one wordlist at a time, pop it off
    if (wordlists.length > 0) {
        return wordlists.shift()    
    }

    swal("Completed Trials", "Successfully rated each list. Your data has not been sent. Please send the data and/or download a copy for yourself!", "success")
    
    return {'algorithm': 'None', 'words': [], 'seed': 'Trial Complete'}
}

function buildWordlists(data, shuffle=false) {
    // In: A list of objects
    //      Schema: { algorithm: name<str>, wordlists: [ { seed: <str>, words: [<str>] } ]

    for (let batch of data) {
        for (let list of batch["wordlists"]) {
            wordlists.push(new Wordlist(batch["algorithm"], list["seed"], list["words"]))
        }
    }

    if (shuffle) {
        wordlists = wordlists.sort(function() { return 0.5 - Math.random() });
    }

    // Sometimes they come in blank, because the CSV is too wide. So lets remove anything without a seed
    wordlists = wordlists.filter(wordlist => wordlist.seed)
    return wordlists
}
var d = {}
function populateWordlists(shuffle=false) {
    let sheet = new Sheet("1rXhznF1JMt2PhL_BsV2ogCdyLR3PcXjKk2UR5y8gNnw", "0")
    return sheet.setupData().then(data => buildWordlists(data, shuffle))
}

function data_to_csv_string(trials, meta=true, header=true) {
    let rows = []
    let meta_text = meta?"data:text/csv;charset=utf-8":""
    if (header)
        rows.push(`${meta_text}Algorithm,Bad Words,Issue Count,Seed,Wordlist`)
    for (let trial of trials) {
        rows.push(`${trial.toString()}`)
    }
    let csv = rows.join("\n")
    return csv
}

function submit_data() {
    let scriptURL = "https://script.google.com/macros/s/AKfycbz3Pzl1KuE_61YE1OQNoeTQ6eOtkdQDiQicrLHH1-3nKL-iXz8/exec"
    let data = new FormData()

    data.append("session", session)
    // We want to use the recent cache of trials, not the full history, to avoid duplicate data in the DB
    data.append("data", data_to_csv_string(trials, meta=false, header=false))
    fetch(scriptURL, { method: 'POST', mode: 'cors', body: data})
      .then(response => {
          swal("Sent Data", "Successfully sent out and cleared your data. Thanks for your help!", "success")
          // Keep a full history of trials, but clear the cache so we don't send duplicates
          trialHistory = trialHistory.concat(trials) 
          trials = []
        })
      .catch(error => {
        swal("Uh oh!", "Something went wrong sending the data. You can try again or download the data as a CSV.", "error")
        console.log(error)
    })
}

function export_csv() {
    // Use the entire trialHistory so local copies can have all of the data.
    let csv = data_to_csv_string(trialHistory)
    var encodedUri = encodeURI(csv);
    var link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "list_comparison_data.csv");
    document.body.appendChild(link);
    link.click()
  }