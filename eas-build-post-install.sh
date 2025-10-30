#!/bin/bash

# This script runs after npm install and before pod install during iOS builds
echo "Running EAS build post-install hook..."

# The fix will be applied after pod install via the patch script
echo "Fix script will run after pod install"
