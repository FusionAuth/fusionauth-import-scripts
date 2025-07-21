#!/bin/bash

# FusionAuth Import Script Wrapper
# This script makes it easier to run the Ruby import script

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if bundle is available
if ! command -v bundle &> /dev/null; then
    echo "Error: Bundler is not installed. Please install it with: gem install bundler"
    exit 1
fi

# Change to the script directory
cd "$SCRIPT_DIR"

# Check if gems are installed
if [ ! -d ".bundle" ] && [ ! -f "Gemfile.lock" ]; then
    echo "Installing required gems..."
    bundle install
fi

# Run the import script with all passed arguments
bundle exec ./import.rb "$@" 