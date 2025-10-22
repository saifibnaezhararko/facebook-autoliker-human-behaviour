// content.js - Facebook Auto Liker + Commenter (Complete Final)

(function () {
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function log(message) {
    console.log(`[Auto Liker] ${message}`);
  }

  // Find NEW like buttons (not processed yet)
  function findNewLikeButtons() {
    const likeButtons = [];
    const byAria = document.querySelectorAll('[aria-label="Like"]');

    for (const btn of byAria) {
      if (btn.dataset.processed === "true") {
        continue;
      }
      likeButtons.push(btn);
    }

    return likeButtons;
  }

  // Find comment button using data-ad-rendering-role
  function findCommentButton(likeButton) {
    log("🔍 Looking for comment button...");

    // Find the post container
    let postContainer = likeButton.closest('[role="article"]');

    if (!postContainer) {
      postContainer = likeButton.closest('[data-pagelet^="FeedUnit"]');
    }

    if (!postContainer) {
      log("⚠️ No post container found, trying global search...");

      // Try global search
      const commentBtn = document.querySelector(
        '[data-ad-rendering-role="comment_button"]'
      );
      if (commentBtn) {
        const clickable =
          commentBtn.parentElement?.parentElement?.parentElement;
        if (clickable) {
          log("✅ Found comment button (global)");
          return clickable;
        }
      }

      log("⚠️ Comment button not found");
      return null;
    }

    // Find comment button inside this post
    const commentBtn = postContainer.querySelector(
      '[data-ad-rendering-role="comment_button"]'
    );

    if (commentBtn) {
      // Navigate up to find the clickable div
      // Structure: data-ad-rendering-role div -> parent -> parent -> clickable div
      const clickable = commentBtn.parentElement?.parentElement?.parentElement;

      if (clickable) {
        log("✅ Found comment button by data-ad-rendering-role");
        return clickable;
      }
    }

    // Fallback: find by "Comment" text in span
    log("⚠️ Trying fallback method (text search)...");
    const spans = postContainer.querySelectorAll("span");
    for (const span of spans) {
      if (span.textContent.trim() === "Comment") {
        const clickable = span.closest("div.x9f619.x1ja2u2z");
        if (clickable) {
          log("✅ Found comment button by text");
          return clickable;
        }
      }
    }

    log("⚠️ Comment button not found");
    return null;
  }

  // Find close button (36px circular with secondary background)
  function findCloseButton() {
    log("🔍 Looking for close button...");

    // Find all buttons
    const allButtons = document.querySelectorAll('[role="button"]');

    for (const btn of allButtons) {
      const style = window.getComputedStyle(btn);

      // Check for 36px x 36px size
      const width = style.width;
      const height = style.height;
      const borderRadius = style.borderRadius;
      const bgColor = style.backgroundColor;

      // Close button characteristics:
      // - 36px x 36px
      // - border-radius: 999px (circular)
      // - background: #E2E5E9 (secondary-button-background)
      const isCircular =
        borderRadius.includes("999px") || borderRadius.includes("50%");
      const isCorrectSize = width === "36px" && height === "36px";
      const hasSecondaryBg =
        bgColor === "rgb(226, 229, 233)" || // #E2E5E9
        bgColor === "rgba(226, 229, 233, 1)";

      if (isCircular && isCorrectSize) {
        // Check if visible
        const isVisible =
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          btn.offsetParent !== null &&
          btn.offsetWidth > 0 &&
          btn.offsetHeight > 0;

        if (isVisible) {
          // Check for "Close" aria-label
          const ariaLabel = btn.getAttribute("aria-label");
          if (
            ariaLabel &&
            (ariaLabel.includes("Close") || ariaLabel.includes("close"))
          ) {
            log("✅ Found close button by aria-label");
            return btn;
          }

          // Check for SVG icon
          const hasSVG = btn.querySelector("svg") !== null;
          if (hasSVG && hasSecondaryBg) {
            log("✅ Found close button by style + SVG");
            return btn;
          }

          // If it matches size and is circular, likely the close button
          if (hasSecondaryBg) {
            log("✅ Found close button by style match");
            return btn;
          }
        }
      }
    }

    log("⚠️ Close button not found");
    return null;
  }

  // Post comment - Using specific comment box selectors
  async function postComment(commentButton, commentText) {
    try {
      log("💬 Clicking comment button...");

      // Scroll to button
      commentButton.scrollIntoView({ behavior: "smooth", block: "center" });
      await sleep(500);

      // Click comment button
      commentButton.click();
      await sleep(2500); // Wait for comment box to appear

      log("💬 Looking for comment input box...");

      // Find comment box - Using specific selectors from outerHTML
      let commentBox = null;

      // Strategy 1: Most specific - aria-label + data-lexical-editor
      commentBox = document.querySelector(
        'div[aria-label="Write a comment…"][data-lexical-editor="true"]'
      );

      if (commentBox) {
        log("💬 Found comment box by aria-label + data-lexical-editor");
      }

      // Strategy 2: role="textbox" + data-lexical-editor
      if (!commentBox) {
        commentBox = document.querySelector(
          'div[role="textbox"][data-lexical-editor="true"]'
        );
        if (commentBox) {
          log("💬 Found comment box by role + data-lexical-editor");
        }
      }

      // Strategy 3: contenteditable + data-lexical-editor
      if (!commentBox) {
        commentBox = document.querySelector(
          'div[contenteditable="true"][data-lexical-editor="true"]'
        );
        if (commentBox) {
          log("💬 Found comment box by contenteditable + data-lexical-editor");
        }
      }

      // Strategy 4: By classes from outerHTML
      if (!commentBox) {
        commentBox = document.querySelector(
          'div.xzsf02u.x1a2a7pz.x1n2onr6.x14wi4xw.notranslate[contenteditable="true"]'
        );
        if (commentBox) {
          log("💬 Found comment box by specific classes");
        }
      }

      // Strategy 5: Any visible contenteditable textbox
      if (!commentBox) {
        const allEditables = document.querySelectorAll(
          'div[contenteditable="true"][role="textbox"]'
        );
        for (const box of allEditables) {
          const style = window.getComputedStyle(box);
          const isVisible =
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            box.offsetParent !== null &&
            box.offsetHeight > 0;

          if (isVisible) {
            commentBox = box;
            log("💬 Found comment box by fallback method");
            break;
          }
        }
      }

      if (!commentBox) {
        log("⚠️ Comment box not found");
        return false;
      }

      // Type comment
      log(`💬 Typing: "${commentText}"`);

      // Focus the comment box
      commentBox.focus();
      await sleep(300);

      // Click to ensure it's active
      commentBox.click();
      await sleep(300);

      // Clear any existing content
      commentBox.innerText = "";
      await sleep(200);

      // Set the comment text
      commentBox.innerText = commentText;
      commentBox.textContent = commentText;

      // Trigger input event (important for Facebook's editor)
      const inputEvent = new Event("input", { bubbles: true });
      commentBox.dispatchEvent(inputEvent);

      // Also trigger beforeinput
      const beforeInputEvent = new Event("beforeinput", { bubbles: true });
      commentBox.dispatchEvent(beforeInputEvent);

      await sleep(500);

      // Verify text was entered
      if (commentBox.innerText.includes(commentText)) {
        log(`✅ Text verified in comment box`);
      } else {
        log(`⚠️ Text might not be fully entered, but continuing...`);
      }

      // Press Enter to post
      log("💬 Pressing Enter to post comment...");

      // Simulate Enter keydown
      const enterDown = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
        composed: true,
      });

      commentBox.dispatchEvent(enterDown);
      await sleep(200);

      // Simulate Enter keypress
      const enterPress = new KeyboardEvent("keypress", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
        composed: true,
      });

      commentBox.dispatchEvent(enterPress);
      await sleep(200);

      // Simulate Enter keyup
      const enterUp = new KeyboardEvent("keyup", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
        composed: true,
      });

      commentBox.dispatchEvent(enterUp);

      log("✅ Enter pressed!");
      await sleep(1500); // Wait for comment to post

      // Click close button
      const closeBtn = findCloseButton();
      if (closeBtn) {
        log("❌ Clicking close button...");
        closeBtn.click();
        await sleep(500);
        log("✅ Comment box closed!");
      } else {
        log("⚠️ Close button not found, trying Escape key...");

        // Try to press Escape key as alternative to close
        const escapeEvent = new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          keyCode: 27,
          which: 27,
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(escapeEvent);
        await sleep(500);
      }

      return true;
    } catch (error) {
      log(`❌ Error posting comment: ${error.message}`);
      console.error("Comment error details:", error);
      return false;
    }
  }

  // Main auto liker + commenter
  async function autoLikerCommenter(targetCount) {
    log(`=== Auto Liker + Commenter Started ===`);
    log(`Target: ${targetCount} posts`);
    log(
      `Pattern: 5sec → scroll → like → 3sec → comment → close → skip 2 → repeat`
    );

    let completedCount = 0;
    const commentText = "nice and attractive";

    await sleep(1500);

    // Main loop
    while (completedCount < targetCount) {
      // ⏸️ 5 SECOND BREAK
      log(`\n⏸️ 5 second break... (${completedCount}/${targetCount} done)`);
      await sleep(5000);

      // ⬇️ SCROLL
      log("⬇️ Scrolling down...");
      window.scrollBy({ top: 400, behavior: "smooth" });
      await sleep(1000);

      // 🔍 FIND LIKE BUTTON
      const newButtons = findNewLikeButtons();

      if (newButtons.length > 0) {
        log(`🔍 Found ${newButtons.length} new like button(s)`);

        const likeButton = newButtons[0];

        // Scroll to it
        likeButton.scrollIntoView({ behavior: "smooth", block: "center" });
        await sleep(500);

        // 👍 LIKE
        log(`👍 Liking post ${completedCount + 1}...`);
        likeButton.click();
        likeButton.dataset.processed = "true";
        log(`✅ Liked!`);

        // ⏸️ 3 SECOND WAIT
        log("⏸️ Waiting 3 seconds...");
        await sleep(3000);

        // 💬 COMMENT
        const commentButton = findCommentButton(likeButton);

        if (commentButton) {
          log(`💬 Found comment button, posting comment...`);
          await postComment(commentButton, commentText);
        } else {
          log(`⚠️ Comment button not found, skipping comment`);
        }

        completedCount++;

        await sleep(1000);

        // 🔽 SKIP 2 POSTS
        log(`⏩ Skipping next 2 posts...`);
        window.scrollBy({ top: 800, behavior: "smooth" });
        await sleep(1000);
      } else {
        log("⚠️ No new like buttons found, scrolling more...");
        window.scrollBy({ top: 600, behavior: "smooth" });
        await sleep(1000);
      }
    }

    log(`\n🎉 === COMPLETED ===`);
    log(`✅ Liked & commented on ${completedCount} posts`);
  }

  // Listen for start command
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.command === "start") {
      log("✅ Starting Auto Liker + Commenter...");
      autoLikerCommenter(request.count);
      sendResponse({ status: "started" });
    }
    return true;
  });

  log("Auto Liker + Commenter ready (Final Version)");
})();
