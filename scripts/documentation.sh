#!/bin/bash

echo "Generating documentation"

documentation build src/messagesManager.js src/buffer.js src/message.js \
    --c scripts/documentation.js \
    --shallow \
    --format md \
    --output README.md \
    --theme node_module/minami \
    # --github true \

echo "Done"
