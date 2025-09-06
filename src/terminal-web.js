// Gift Calculator Terminal Emulator - Template Version
// Interactive terminal demo for the gift-calc CLI tool
// VERSION: {{VERSION}} - This placeholder will be replaced by GitHub Actions

class GiftCalcTerminal {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      prompt: '$ ',
      welcomeMessage: 'Welcome to Gift Calculator! Type "help" or try "gift-calc -b 100 -f 8"',
      ...options
    };
    
    this.history = [];
    this.historyIndex = -1;
    this.commandBuffer = '';
    this.currentInput = null;
    this.isTyping = false;
    
    // Available commands and their completions
    this.commands = {
      'gift-calc': {
        flags: ['-b', '--basevalue', '-v', '--variation', '-f', '--friend-score', 
               '-n', '--nice-score', '-c', '--currency', '-d', '--decimals', 
               '--name', '--max', '--min', '--asshole', '--dickhead', 
               '--no-log', '-cp', '--copy', '-h', '--help', '--version'],
        subcommands: ['init-config', 'update-config', 'log']
      },
      'gcalc': {
        flags: ['-b', '--basevalue', '-v', '--variation', '-f', '--friend-score', 
               '-n', '--nice-score', '-c', '--currency', '-d', '--decimals', 
               '--name', '--max', '--min', '--asshole', '--dickhead', 
               '--no-log', '-cp', '--copy', '-h', '--help', '--version'],
        subcommands: ['init-config', 'update-config', 'log']
      },
      'help': {},
      'clear': {},
      'history': {}
    };
    
    this.init();
  }
  
  init() {
    this.createTerminalStructure();
    this.addWelcomeMessage();
    this.createInputLine();
    this.bindEvents();
    this.focusInput();
  }
  
  createTerminalStructure() {
    this.container.innerHTML = `
      <div class="terminal-content">
        <div class="terminal-output"></div>
      </div>
    `;
    
    this.output = this.container.querySelector('.terminal-output');
  }
  
  addWelcomeMessage() {
    if (this.options.welcomeMessage) {
      this.addOutput(this.options.welcomeMessage, 'info');
      this.addOutput('', 'blank');
    }
  }
  
  createInputLine() {
    const inputLine = document.createElement('div');
    inputLine.className = 'terminal-input-line';
    inputLine.innerHTML = `
      <span class="terminal-prompt">${this.options.prompt}</span>
      <input type="text" class="terminal-input" autocomplete="off" spellcheck="false">
    `;
    
    this.container.appendChild(inputLine);
    this.currentInput = inputLine.querySelector('.terminal-input');
    
    // Bind events to the new input
    this.bindInputEvents();
  }
  
  bindEvents() {
    // Bind input events
    this.bindInputEvents();
    
    // Bind container events (only once)
    this.container.addEventListener('click', () => this.focusInput());
  }
  
  bindInputEvents() {
    if (this.currentInput) {
      this.currentInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
      this.currentInput.addEventListener('input', (e) => this.handleInput(e));
    }
  }
  
  handleKeyDown(e) {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        this.executeCommand();
        break;
        
      case 'Tab':
        e.preventDefault();
        this.handleTabCompletion();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        this.navigateHistory(-1);
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        this.navigateHistory(1);
        break;
        
      case 'Escape':
        e.preventDefault();
        this.currentInput.value = '';
        this.historyIndex = -1;
        break;
    }
  }
  
  handleInput(e) {
    this.commandBuffer = e.target.value;
  }
  
  executeCommand() {
    const command = this.currentInput.value.trim();
    if (!command) {
      this.createNewInputLine();
      return;
    }
    
    // Add command to history
    this.history.unshift(command);
    if (this.history.length > 100) {
      this.history.pop();
    }
    this.historyIndex = -1;
    
    // Display the command in terminal
    this.addOutput(`${this.options.prompt}${command}`, 'command');
    
    // Execute the command
    this.runCommand(command);
  }
  
  runCommand(command) {
    const args = this.parseCommand(command);
    const baseCommand = args[0];
    
    switch (baseCommand) {
      case 'help':
        this.showHelp();
        break;
        
      case 'clear':
        this.clearTerminal();
        break;
        
      case 'history':
        this.showHistory();
        break;
        
      case 'gift-calc':
      case 'gcalc':
        this.executeGiftCalc(args.slice(1));
        break;
        
      default:
        if (baseCommand) {
          this.addOutput(`Command not found: ${baseCommand}`, 'error');
          this.addOutput('Type "help" for available commands', 'info');
        }
        break;
    }
    
    this.createNewInputLine();
  }
  
  executeGiftCalc(args) {
    try {
      // Parse arguments using the core library
      const config = window.GiftCalc.parseArguments(args, {});
      
      if (config.showHelp) {
        this.addOutput(window.GiftCalc.getHelpText(), 'help');
        return;
      }
      
      if (config.command === 'version') {
        this.addOutput('gift-calc version {{VERSION}}', 'info');
        return;
      }
      
      if (config.command) {
        switch (config.command) {
          case 'init-config':
            this.addOutput('Configuration setup is not available in the web demo.', 'info');
            this.addOutput('Use the actual CLI tool to configure defaults.', 'info');
            break;
            
          case 'update-config':
            this.addOutput('Configuration update is not available in the web demo.', 'info');
            this.addOutput('Use the actual CLI tool to update configuration.', 'info');
            break;
            
          case 'log':
            this.addOutput('Log viewing is not available in the web demo.', 'info');
            this.addOutput('Use the actual CLI tool to view calculation logs.', 'info');
            break;
        }
        return;
      }
      
      // Calculate the gift amount
      const amount = window.GiftCalc.calculateFinalAmount(
        config.baseValue,
        config.variation,
        config.friendScore,
        config.niceScore,
        config.decimals,
        config.useMaximum,
        config.useMinimum
      );
      
      // Format and display the result
      const output = window.GiftCalc.formatOutput(amount, config.currency, config.recipientName);
      this.addOutput(output, 'success');
      
      // Show additional info for demo purposes
      if (config.copyToClipboard) {
        this.addOutput(`Amount ${amount} copied to clipboard`, 'info');
        this.copyToClipboard(amount.toString());
      }
      
    } catch (error) {
      this.addOutput(`Error: ${error.message}`, 'error');
    }
  }
  
  parseCommand(command) {
    // Simple command parsing - handles quoted arguments
    const args = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < command.length; i++) {
      const char = command[i];
      
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          args.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    
    if (current) {
      args.push(current);
    }
    
    return args;
  }
  
  handleTabCompletion() {
    const input = this.currentInput.value;
    const words = input.split(' ');
    const currentWord = words[words.length - 1];
    const previousWord = words[words.length - 2];
    
    let completions = [];
    
    if (words.length === 1) {
      // Complete command names
      completions = Object.keys(this.commands).filter(cmd => 
        cmd.startsWith(currentWord)
      );
    } else if (words[0] === 'gift-calc' || words[0] === 'gcalc') {
      // Complete gift-calc flags and subcommands
      const giftCalcCommands = this.commands[words[0]];
      
      if (currentWord.startsWith('-')) {
        // Complete flags
        completions = giftCalcCommands.flags.filter(flag => 
          flag.startsWith(currentWord)
        );
      } else if (words.length === 2) {
        // Complete subcommands
        completions = giftCalcCommands.subcommands.filter(sub => 
          sub.startsWith(currentWord)
        );
      }
    }
    
    if (completions.length === 1) {
      // Single completion - replace current word
      const completed = completions[0];
      words[words.length - 1] = completed;
      this.currentInput.value = words.join(' ') + ' ';
      this.currentInput.setSelectionRange(this.currentInput.value.length, this.currentInput.value.length);
    } else if (completions.length > 1) {
      // Multiple completions - show them
      this.addOutput(`${this.options.prompt}${input}`, 'command');
      this.addOutput(completions.join('  '), 'info');
      this.createNewInputLine();
      this.currentInput.value = input;
    }
  }
  
  navigateHistory(direction) {
    if (this.history.length === 0) return;
    
    if (direction === -1) {
      // Up arrow - previous command
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        this.currentInput.value = this.history[this.historyIndex];
      }
    } else {
      // Down arrow - next command
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.currentInput.value = this.history[this.historyIndex];
      } else if (this.historyIndex === 0) {
        this.historyIndex = -1;
        this.currentInput.value = '';
      }
    }
    
    // Move cursor to end
    this.currentInput.setSelectionRange(this.currentInput.value.length, this.currentInput.value.length);
  }
  
  showHelp() {
    const helpText = `
Available commands:

gift-calc [options]         Calculate gift amount
gcalc [options]            Short alias for gift-calc

Common options:
  -b, --basevalue <num>     Set base value (default: 70)
  -v, --variation <percent> Set variation 0-100 (default: 20)  
  -f, --friend-score <1-10> Friend score (default: 5)
  -n, --nice-score <0-10>   Nice score (default: 5)
  -c, --currency <code>     Currency code (default: SEK)
  --name <name>             Recipient name
  --max                     Use maximum amount
  --min                     Use minimum amount
  -h, --help               Show detailed help
  --version                Show version information

Terminal commands:
  help                      Show this help
  clear                     Clear terminal  
  history                   Show command history

Examples:
  gift-calc
  gift-calc -b 100 -f 8 --name "Alice"
  gcalc -c USD -v 30 -n 9
  gift-calc -b 50 --dickhead
  gift-calc --help

Use Tab for command completion, ↑/↓ for history.
    `;
    
    this.addOutput(helpText.trim(), 'info');
  }
  
  showHistory() {
    if (this.history.length === 0) {
      this.addOutput('No command history', 'info');
      return;
    }
    
    this.addOutput('Recent commands:', 'info');
    this.history.slice(0, 10).forEach((cmd, index) => {
      this.addOutput(`${index + 1}. ${cmd}`, 'output');
    });
  }
  
  clearTerminal() {
    this.output.innerHTML = '';
  }
  
  addOutput(text, type = 'output') {
    if (type === 'help' || (text.includes('DESCRIPTION:') || text.includes('USAGE:') || text.includes('OPTIONS:'))) {
      // For help text, preserve formatting with pre-formatted text
      const pre = document.createElement('pre');
      pre.className = `terminal-line terminal-${type}`;
      pre.style.whiteSpace = 'pre-wrap';
      pre.style.fontFamily = 'inherit';
      pre.style.margin = '0';
      pre.textContent = text;
      this.output.appendChild(pre);
    } else {
      const line = document.createElement('div');
      line.className = `terminal-line terminal-${type}`;
      line.textContent = text;
      this.output.appendChild(line);
    }
    
    this.scrollToBottom();
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  createNewInputLine() {
    // Remove current input line
    const currentLine = this.container.querySelector('.terminal-input-line');
    if (currentLine) {
      currentLine.remove();
    }
    
    // Create new input line
    this.createInputLine();
    this.focusInput();
  }
  
  focusInput() {
    if (this.currentInput) {
      this.currentInput.focus();
    }
  }
  
  scrollToBottom() {
    this.container.scrollTop = this.container.scrollHeight;
  }
  
  copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => {
        this.fallbackCopyToClipboard(text);
      });
    } else {
      this.fallbackCopyToClipboard(text);
    }
  }
  
  fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Could not copy to clipboard:', err);
    }
    
    textArea.remove();
  }
  
  // Public API methods
  executeCommandString(command) {
    this.currentInput.value = command;
    this.executeCommand();
  }
  
  type(text, speed = 50) {
    if (this.isTyping) return;
    
    this.isTyping = true;
    this.currentInput.value = '';
    let index = 0;
    
    const typeChar = () => {
      if (index < text.length) {
        this.currentInput.value += text[index];
        index++;
        setTimeout(typeChar, speed);
      } else {
        this.isTyping = false;
      }
    };
    
    typeChar();
  }
  
}

// Initialize terminal when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize terminal if container exists
  const terminalContainer = document.getElementById('gift-calc-terminal');
  if (terminalContainer) {
    window.giftCalcTerminal = new GiftCalcTerminal('gift-calc-terminal', {
      welcomeMessage: 'Welcome to Gift Calculator! Type "gift-calc -h" for help or try "gift-calc -b 100 -f 8"'
    });
  }
});