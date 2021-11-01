#!/bin/bash

# Make a temporary directory to hold the archive
TMPDIR=$(mktemp -d -t bundle-XXXXXXXXXXX)

# Make sure our script cleans up the temporary directory when it
# exits.
function cleanup {
    rm -rf "${TMPDIR}"
}
trap cleanup EXIT

# Copy all of our files into the temporary directory, as well as our
# bundle.ini file.
cp -r *.html *.js *.css *.wav bundle.ini ${TMPDIR}

# We want to make a bundle file in the current directory.
BUNDLE_FILE="$(pwd)/html-pong-example.bundle"

# Remove any old bundle file, so that we start afresh.
rm -f ${BUNDLE_FILE}

# Now, change to the temporary directory and zip its contents
# there. We do it this way to get the paths in the bundle right.
pushd ${TMPDIR} && zip -r "${BUNDLE_FILE}" . ; popd
