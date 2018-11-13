class Sheet {
    constructor(sheet, gid) {
        this.sheet = sheet
        this.gid = gid
        this.data = {}
    }

    parseResponse(res) {
        // This is a very magic, specifically implemented parser
        // for the format my data sheets are in. Will need adjustment
        // with new formats

        // Use a lovely lightweight CSV library from gkindel
        this.data = CSV.parse(res)
        // Each batch is a header of params (column 0), a header of words, and a row for each word
        // This means a batch of words is 12 rows total
        // Each batch represents a different algorithm
        let batches = []
        let row_start = 0
        while (row_start < this.data.length) {
            let algorithm = this.data[row_start][0]
            let row = row_start + 1
            let seeds = this.data[row]
            let wordlists = []

            // Cursor now on the zeroeth word in each list
            row += 1

            for (let c = 0; c < seeds.length; c++) {
                let wordlist = {"seed": seeds[c], "words": []}
                for (let r =  0; r < 10; r++) {
                    wordlist["words"].push(this.data[row+r][c])
                }
                wordlists.push(wordlist)
            }
            row_start += 12
            batches.push({"algorithm": algorithm, "wordlists": wordlists})
        }

        return batches
    }

    setupData() {
        return this.getData().then(response => response.text())
                    .then(response => this.parseResponse(response))
                    .catch(err => console.error(err))
    }

    getData() {
        let url = `https://docs.google.com/spreadsheets/d/${this.sheet}/gviz/tq?gid=${this.gid}&tqx=out:csv`
        let request = new Request(url)
        return fetch(request);
    }
}

class Wordlist {
    constructor(algorithm, seed, nearest) {
        this.algorithm = algorithm
        this.seed = seed
        this.nearest = nearest
    }
    diff(other) {
        let compare = other.nearest
        return this.nearest.filter(function(i) {return compare.indexOf(i) < 0;});
    }

    getIssueButtons(word) {
        let issues = ['U', 'S', 'O', 'D', 'Oth']
        let html = ''
        for (let issue of issues) {
            html += `<button class='issue' id='${word}-${issue}' onclick='selectIssue("${word}", "${issue}");return false;'>${issue}</button>`
        }
        return html
    }

    HTML(list) {
        let out = ''
        for (let word of list) {
            out += `<li>${this.getIssueButtons(word)} ${word}</li>`
        }
        return out 
    }
    toHTML() {
        return this.HTML(this.nearest)
    }
}

class Trial {
    constructor(wordlist) {
        this.wordlist = {}
        for (let word of wordlist.nearest) {
            this.wordlist[word] = {'U': false, 'D': false, 'O': false, 'Oth': false}
        }
        this.seed = wordlist.seed
        this.algorithm = wordlist.algorithm
        this.badWords = 0
        this.numIssues = 0
    }

    toggle(word, issue) {
        this.wordlist[word][issue] = !this.wordlist[word][issue]
        this.recount()
    }

    recount() {
        this.numIssues = 0
        this.badWords = 0
        for (let word in this.wordlist) {
            let issues = this.wordlist[word]
            let found = 0

            for (let issue in issues) {
                found += issues[issue]
            }

            this.numIssues += found
            if (found > 0) {
                this.badWords += 1
            }
        }
    }

    toString() {
        let wlString = ''
        this.recount()
        for (let word in this.wordlist) {
            let issues = this.wordlist[word]
            let found = []

            for (let issue in issues) {
                if (issues[issue]) found.push(issue);
            }

            wlString += word

            for (let issue of found) {
                wlString += `:${issue}`
            }
            wlString += `,`
        }
        wlString = wlString.slice(0, wlString.length - 1)
        return `${this.algorithm},${this.badWords},${this.numIssues},${this.seed},${wlString}`
    }
}