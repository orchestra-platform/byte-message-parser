#!/bin/bash

echo "Generating documentation"

documentation build src/serialPortHelper.js src/messagesManager.js \
    --c scripts/documentation.js \
    --shallow \
    --format md \
    --output README.md \
    --theme node_module/minami \
    # --github true \

echo "Done"
