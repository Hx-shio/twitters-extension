document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const toggleVisibilityBtn = document.getElementById('toggleVisibility');
  const saveApiKeyBtn = document.getElementById('saveApiKey');
  const statusMessage = document.getElementById('statusMessage');
  const eyeIcon = toggleVisibilityBtn.querySelector('.eye-icon');
  const authSection = document.getElementById('auth-section');
  const userSection = document.getElementById('user-section');
  const logoutButton = document.getElementById('logoutButton');
  const importAccountsButton = document.getElementById('importAccountsButton');

  // UI Elements for user info
  const usernameElement = document.getElementById('username');
  const balanceElement = document.getElementById('balance');
  const vendorStatusElement = document.getElementById('vendor-status');

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

  // Check for saved API key on load
  chrome.storage.sync.get(['twittersApiKey'], (result) => {
    if (result.twittersApiKey) {
      apiKeyInput.value = result.twittersApiKey;
      validateApiKey(result.twittersApiKey);
    }
  });

  // Toggle API key visibility
  toggleVisibilityBtn.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      eyeIcon.innerHTML = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      `;
    } else {
      apiKeyInput.type = 'password';
      eyeIcon.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      `;
    }
  });

  // Handle input changes
  apiKeyInput.addEventListener('input', () => {
    apiKeyInput.classList.toggle('has-value', apiKeyInput.value.length > 0);
  });

  // Save and validate API key
  saveApiKeyBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      apiKeyInput.focus();
      return;
    }

    // Add loading state
    saveApiKeyBtn.disabled = true;
    saveApiKeyBtn.innerHTML = `
      <div class="spinner"></div>
      Verifying...
    `;

    try {
      await validateApiKey(apiKey);
    } catch (error) {
      showStatus(error.message || 'Failed to validate API key', 'error');
    } finally {
      // Restore button state
      saveApiKeyBtn.disabled = false;
      saveApiKeyBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
        Save API Key
      `;
    }
  });

  // Import accounts button click handler
  importAccountsButton.addEventListener('click', () => {
    window.location.href = 'import.html';
  });

  // Logout functionality
  logoutButton.addEventListener('click', () => {
    chrome.storage.sync.remove('twittersApiKey', () => {
      showAuthSection();
      apiKeyInput.value = '';
      apiKeyInput.classList.remove('has-value');
      showStatus('Logged out successfully', 'success');
    });
  });

  async function validateApiKey(apiKey) {
    try {
      const response = await fetch('https://twitters.io/market/ajax/user/extension/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: `api_key=${encodeURIComponent(apiKey)}`
      });

      const data = await response.json();

      if (data.success) {
        chrome.storage.sync.set({ twittersApiKey: apiKey }, () => {
          chrome.storage.local.set({ twittersAuthData: data.data }, () => {
            updateUserInfo(data.data);
            showUserSection();
          });
        });
      } else {
        showStatus('Invalid API key', 'error');
      }

    } catch (error) {
      throw new Error(error.message || 'Failed to validate API key');
    }
  }

  function updateUserInfo(userData) {
    usernameElement.textContent = userData.username;
    balanceElement.textContent = `$${userData.balance.toFixed(2)}`;
    vendorStatusElement.textContent = userData.vendor_status ? 'Vendor' : 'User';
  }

  function showUserSection() {
    authSection.classList.add('hidden');
    userSection.classList.remove('hidden');
  }

  function showAuthSection() {
    authSection.classList.remove('hidden');
    userSection.classList.add('hidden');
  }

  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message';
    
    // Force a reflow to ensure animation works
    statusMessage.offsetHeight;
    
    // Add the appropriate class
    statusMessage.classList.add(type);
    
    // Hide the message after 3 seconds
    setTimeout(() => {
      statusMessage.classList.remove(type);
    }, 3000);
  }
}); 