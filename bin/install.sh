#!/bin/bash

# gift-calc installation script
# This script installs gift-calc from source

set -e

REPO_URL="https://github.com/gift-calc/gift-calc"
INSTALL_DIR="$HOME/.local/share/gift-calc"
BIN_DIR="$HOME/.local/bin"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prereqs() {
    print_info "Checking prerequisites..."
    
    if ! command_exists node; then
        print_error "Node.js is required but not installed."
        print_info "Please install Node.js (>= 18.0.0) from https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | sed 's/v//')
    REQUIRED_VERSION="18.0.0"
    if ! node -e "process.exit(require('semver').gte('$NODE_VERSION', '$REQUIRED_VERSION') ? 0 : 1)" 2>/dev/null; then
        # Fallback version check without semver
        MAJOR_VERSION=$(echo "$NODE_VERSION" | cut -d. -f1)
        if [ "$MAJOR_VERSION" -lt 18 ]; then
            print_error "Node.js >= 18.0.0 is required. Current version: v$NODE_VERSION"
            exit 1
        fi
    fi
    
    if ! command_exists git; then
        print_error "Git is required but not installed."
        print_info "Please install Git from https://git-scm.com/"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Create directories
create_dirs() {
    print_info "Creating installation directories..."
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$BIN_DIR"
    print_success "Directories created"
}

# Clone or update repository
install_source() {
    print_info "Installing gift-calc from source..."
    
    if [ -d "$INSTALL_DIR/.git" ]; then
        print_info "Updating existing installation..."
        cd "$INSTALL_DIR"
        git pull origin main
    else
        print_info "Cloning repository..."
        git clone "$REPO_URL" "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi
    
    print_success "Source code installed"
}

# Create executable wrappers
create_executables() {
    print_info "Creating executable wrappers..."
    
    # Create gift-calc executable
    cat > "$BIN_DIR/gift-calc" << 'EOF'
#!/bin/bash
exec node "$HOME/.local/share/gift-calc/index.js" "$@"
EOF
    
    # Create gcalc executable (alias)
    cat > "$BIN_DIR/gcalc" << 'EOF'
#!/bin/bash
exec node "$HOME/.local/share/gift-calc/index.js" "$@"
EOF
    
    chmod +x "$BIN_DIR/gift-calc"
    chmod +x "$BIN_DIR/gcalc"
    
    print_success "Executable wrappers created"
}

# Update PATH
update_path() {
    print_info "Checking PATH configuration..."
    
    # Check if ~/.local/bin is in PATH
    if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
        print_warning "$HOME/.local/bin is not in your PATH"
        print_info "Adding $HOME/.local/bin to PATH in shell configuration files..."
        
        # Add to common shell config files
        for shell_config in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.profile"; do
            if [ -f "$shell_config" ] || [ "$shell_config" = "$HOME/.profile" ]; then
                if ! grep -q "\.local/bin" "$shell_config" 2>/dev/null; then
                    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$shell_config"
                    print_success "Added to $shell_config"
                fi
            fi
        done
        
        print_warning "Please restart your shell or run: source ~/.bashrc (or your shell config)"
        print_info "Or add $HOME/.local/bin to your PATH manually"
    else
        print_success "PATH is already configured correctly"
    fi
}

# Verify installation
verify_installation() {
    print_info "Verifying installation..."
    
    if [ -x "$BIN_DIR/gift-calc" ] && [ -x "$BIN_DIR/gcalc" ]; then
        print_success "gift-calc installed successfully!"
        print_info ""
        print_info "Usage:"
        print_info "  gift-calc --help    # Show help"
        print_info "  gcalc -b 100        # Quick calculation"
        print_info "  gift-calc init-config  # Setup configuration"
        print_info ""
        
        # Test if commands work (if PATH is set)
        if command_exists gift-calc; then
            VERSION_INFO=$("$BIN_DIR/gift-calc" --help | head -1 2>/dev/null || echo "gift-calc")
            print_success "Commands are ready to use: $VERSION_INFO"
        else
            print_warning "Commands will be available after PATH is updated"
        fi
    else
        print_error "Installation failed - executables not found"
        exit 1
    fi
}

# Main installation process
main() {
    echo ""
    print_info "gift-calc Installation Script"
    print_info "=============================="
    echo ""
    
    check_prereqs
    create_dirs
    install_source
    create_executables
    update_path
    verify_installation
    
    echo ""
    print_success "Installation complete!"
    echo ""
}

# Run main function
main "$@"