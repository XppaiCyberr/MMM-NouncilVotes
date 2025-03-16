Module.register("MMM-NouncilVotes", {
    defaults: {
        updateInterval: 5 * 60 * 1000, // Update every 5 minutes
        maxEntries: 10, // Number of entries visible at once
        cycleInterval: 15 * 1000, // Cycle through data every 10 seconds
        showTwitter: false, // Whether to show Twitter handles
        showWallet: false, // Whether to show wallet addresses
        minParticipationRate: 0, // Minimum participation rate to show (0-100)
        highlightTopVoters: true, // Whether to highlight top 3 voters
        animationSpeed: 2000, // Speed of transitions in milliseconds
        showLastUpdated: true // Whether to show when data was last updated
    },

    start: function() {
        Log.info("Starting module: " + this.name);
        this.voters = [];
        this.loaded = false;
        this.currentPage = 0;
        this.lastUpdated = null;
        this.scheduleUpdate();
    },

    getStyles: function() {
        return ["MMM-NouncilVotes.css"];
    },

    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "mmm-nouncilvotes";

        if (!this.loaded) {
            const loadingDiv = document.createElement("div");
            loadingDiv.className = "loading-container";
            loadingDiv.innerHTML = "<div class='loading-spinner'></div><div class='loading-text'>Loading Noun voting data...</div>";
            wrapper.appendChild(loadingDiv);
            return wrapper;
        }

        // Header
        const header = document.createElement("div");
        header.className = "module-header";
        header.innerHTML = "Nouncil Voting Participation";
        wrapper.appendChild(header);

        // Container for the table
        const tableContainer = document.createElement("div");
        tableContainer.className = "table-container";

        const table = document.createElement("table");
        table.className = "voter-table";

        // Table header
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        ["Username", "Votes", "Participation"].forEach(text => {
            const th = document.createElement("th");
            th.innerHTML = text;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Table body
        const tbody = document.createElement("tbody");
        
        // Calculate page boundaries
        const totalVoters = this.voters.filter(voter => voter.participationRate >= this.config.minParticipationRate);
        const pageCount = Math.ceil(totalVoters.length / this.config.maxEntries);
        const startIndex = this.currentPage * this.config.maxEntries;
        const endIndex = Math.min(startIndex + this.config.maxEntries, totalVoters.length);
        
        // Display current page of voters
        totalVoters.slice(startIndex, endIndex).forEach((voter, index) => {
            const row = document.createElement("tr");
            
            // Add class for top voters if highlighting is enabled
            if (this.config.highlightTopVoters && startIndex + index < 3) {
                row.classList.add("top-voter");
                row.classList.add(`rank-${startIndex + index + 1}`);
            }
            
            // Username cell
            const nameCell = document.createElement("td");
            nameCell.className = "align-left";
            
            // Add rank number
            const rankSpan = document.createElement("span");
            rankSpan.className = "rank";
            rankSpan.innerHTML = (startIndex + index + 1) + ". ";
            nameCell.appendChild(rankSpan);
            
            // Add username
            const nameSpan = document.createElement("span");
            nameSpan.className = "username";
            nameSpan.innerHTML = voter.username;
            nameCell.appendChild(nameSpan);
            
            // Add Twitter handle if enabled
            if (this.config.showTwitter && voter.twitterAddress) {
                const twitterSpan = document.createElement("span");
                twitterSpan.className = "twitter";
                twitterSpan.innerHTML = ` @${voter.twitterAddress}`;
                nameCell.appendChild(twitterSpan);
            }
            
            row.appendChild(nameCell);

            // Votes cell
            const votesCell = document.createElement("td");
            votesCell.innerHTML = `${voter.votesParticipated}/${voter.votesEligible}`;
            row.appendChild(votesCell);

            // Participation rate cell with visual indicator
            const rateCell = document.createElement("td");
            
            // Add percentage text
            const percentText = document.createElement("span");
            percentText.innerHTML = voter.participationRate.toFixed(1) + "%";
            rateCell.appendChild(percentText);
            
            // Add visual bar
            const progressBar = document.createElement("div");
            progressBar.className = "progress-bar";
            
            const progressFill = document.createElement("div");
            progressFill.className = "progress-fill";
            progressFill.style.width = `${voter.participationRate}%`;
            
            // Color based on participation rate
            if (voter.participationRate >= 80) {
                progressFill.classList.add("high-participation");
            } else if (voter.participationRate >= 50) {
                progressFill.classList.add("medium-participation");
            } else {
                progressFill.classList.add("low-participation");  
            }
            
            progressBar.appendChild(progressFill);
            rateCell.appendChild(progressBar);
            
            row.appendChild(rateCell);

            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        wrapper.appendChild(tableContainer);
        
        // Add pagination indicator if there are multiple pages
        if (pageCount > 1) {
            const paginationDiv = document.createElement("div");
            paginationDiv.className = "pagination";
            paginationDiv.innerHTML = `Page ${this.currentPage + 1}/${pageCount}`;
            wrapper.appendChild(paginationDiv);
        }
        
        // Add last updated timestamp if enabled
        if (this.config.showLastUpdated && this.lastUpdated) {
            const timestampDiv = document.createElement("div");
            timestampDiv.className = "last-updated";
            
            const timeAgo = this.getTimeAgo(this.lastUpdated);
            timestampDiv.innerHTML = `Last updated: ${timeAgo}`;
            wrapper.appendChild(timestampDiv);
        }

        return wrapper;
    },

    getTimeAgo: function(timestamp) {
        const now = new Date();
        const diff = Math.floor((now - timestamp) / 1000);
        
        if (diff < 60) return `${diff} seconds ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
        return `${Math.floor(diff / 86400)} days ago`;
    },

    scheduleUpdate: function() {
        const self = this;
        // Schedule data updates
        setInterval(function() {
            self.updateVoters();
        }, this.config.updateInterval);
        
        // Schedule UI cycling for pagination
        setInterval(function() {
            if (self.loaded) {
                const eligibleVoters = self.voters.filter(voter => 
                    voter.participationRate >= self.config.minParticipationRate
                );
                const pageCount = Math.ceil(eligibleVoters.length / self.config.maxEntries);
                
                if (pageCount > 1) {
                    self.currentPage = (self.currentPage + 1) % pageCount;
                    self.updateDom(self.config.animationSpeed);
                }
            }
        }, this.config.cycleInterval);
        
        // Initial update
        this.updateVoters();
    },

    updateVoters: function() {
        const self = this;
        fetch("https://api.nouncil.wtf")
            .then(response => response.json())
            .then(data => {
                self.voters = data.sort((a, b) => b.participationRate - a.participationRate);
                self.loaded = true;
                self.lastUpdated = new Date();
                self.updateDom(self.config.animationSpeed);
            })
            .catch(error => {
                Log.error("Error fetching Noun voting data: " + error);
            });
    }
});
