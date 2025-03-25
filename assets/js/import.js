document.addEventListener('DOMContentLoaded', () => {
    const backButton = document.getElementById('backButton');
    const accountsTable = document.getElementById('accountsTable');
    
    // Handle back button click
    backButton.addEventListener('click', () => {
        window.location.href = 'popup.html';
    });

    // Add ripple effect to buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('click', createRipple);
    });

    function createRipple(event) {
        const button = event.currentTarget;
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        
        ripple.className = 'ripple';
        ripple.style.left = `${event.clientX - rect.left}px`;
        ripple.style.top = `${event.clientY - rect.top}px`;
        
        button.appendChild(ripple);
        
        ripple.addEventListener('animationend', () => {
            ripple.remove();
        });
    }

    // Load accounts data from storage
    async function loadAccounts() {
        try {
            const authData = await new Promise((resolve) => {
                chrome.storage.local.get(['twittersAuthData'], (result) => {
                    resolve(result.twittersAuthData);
                });
            });

            if (!authData) {
                window.location.href = 'popup.html';
                return;
            }

            populateTable(authData);
        } catch (error) {
            showError('Failed to load accounts');
        }
    }

    function populateTable(data) {
        const tbody = accountsTable.querySelector('tbody');
        tbody.innerHTML = '';

        if (!data.accounts || Object.keys(data.accounts).length === 0) {
            showError('No accounts available');
            return;
        }

        Object.entries(data.accounts).forEach(([listingId, account]) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${account.name}</td>
                <td>
                    <button class="import-button" 
                        data-auth="${encodeURIComponent(account.auth_token)}"
                        data-pass="${encodeURIComponent(account.password)}"
                        data-email="${encodeURIComponent(account.email)}">
                        Import
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Add click handlers for import buttons
        const importButtons = tbody.querySelectorAll('.import-button');
        importButtons.forEach(button => {
            button.addEventListener('click', handleImport);
        });
    }

    async function handleImport(event) {
        const button = event.currentTarget;
        const authToken = decodeURIComponent(button.dataset.auth);
        const password = decodeURIComponent(button.dataset.pass);
        const email = decodeURIComponent(button.dataset.email);
        
        // Get current tab URL
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const url = new URL(tab.url);
            
            if (url.hostname !== 'x.com') {
                alert('Please navigate to x.com before importing an account');
                return;
            }

            // Clear existing cookies for x.com
            const cookies = await chrome.cookies.getAll({ domain: '.x.com' });
            for (const cookie of cookies) {
                await chrome.cookies.remove({
                    url: 'https://x.com',
                    name: cookie.name
                });
            }

            // Clear localStorage for x.com
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    localStorage.clear();
                }
            });

            // Calculate expiration date (1 year from now)
            const expirationDate = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);

            // Set the auth_token cookie
            await chrome.cookies.set({
                url: 'https://x.com',
                name: 'auth_token',
                value: authToken,
                domain: '.x.com',
                path: '/',
                secure: true,
                httpOnly: true,
                expirationDate: expirationDate
            });

            // Close the popup after successful import
            window.close();
        } catch (error) {
            console.error('Import error:', error);
            alert('Error importing account: ' + error.message);
        }
    }

    function showError(message) {
        const tbody = accountsTable.querySelector('tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="2" style="text-align: center; color: #dc3545;">
                    ${message}
                </td>
            </tr>
        `;
    }

    // Load accounts when page loads
    loadAccounts();
}); 