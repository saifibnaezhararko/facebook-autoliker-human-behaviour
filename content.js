// content.js - Facebook Auto Liker + Commenter (Complete Final with Full Randomization)

(function () {
  let isRunning = false; // Stop flag
  let processedPostIds = new Set(); // Track processed posts by ID

  // Statistics
  let stats = {
    liked: 0,
    commented: 0,
    likedOnly: 0,
    commentedOnly: 0,
    both: 0,
    likeFirst: 0,
    commentFirst: 0,
  };

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function log(message) {
    console.log(`[Auto Liker] ${message}`);
  }

  // Random number generator with range
  function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Random choice from array
  function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Random comment texts
  const commentTexts = [
    "Nice post! 👍",
    "Great content!",
    "Love this! ❤️",
    "Awesome! 🔥",
    "Amazing! ✨",
    "Beautiful! 😍",
    "Interesting! 🤔",
    "Well said! 👏",
    "So true! 💯",
    "Perfect! ⭐",
    "Good post!",
    "nice and attractive",
    "Wonderful! 🌟",
    "Brilliant! 💡",
    "Fantastic! 🎉",
    "Impressive! 👌",
    "Cool! 😎",
    "Great! 👍",
    "Lovely! 💕",
    "Superb! 🌈",
  ];

  // Get random comment text
  function getRandomComment() {
    return randomChoice(commentTexts);
  }

  // Random delay (more human-like)
  async function randomDelay(minMs, maxMs) {
    const delay = random(minMs, maxMs);
    log(`⏳ Random delay: ${(delay / 1000).toFixed(1)}s`);
    await sleep(delay);
  }

  // Generate unique ID for post
  function getPostId(element) {
    // Try to find unique identifier
    const postContainer =
      element.closest('[role="article"]') ||
      element.closest('[data-pagelet^="FeedUnit"]');
    if (!postContainer) return null;

    // Try multiple strategies to get unique ID
    const id =
      postContainer.getAttribute("id") ||
      postContainer.getAttribute("data-pagelet") ||
      postContainer.querySelector('a[href*="/posts/"]')?.href ||
      postContainer.querySelector('a[href*="/permalink/"]')?.href ||
      postContainer.innerHTML.substring(0, 100); // Fallback to content hash

    return id;
  }

  // Check if element is visible in viewport
  function isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;
    return rect.top >= 0 && rect.bottom <= viewportHeight;
  }

  // Scroll to element only if below viewport (never scroll up)
  async function scrollToElementIfNeeded(element) {
    const rect = element.getBoundingClientRect();
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;

    // If element is below viewport, scroll down to it
    if (rect.top > viewportHeight) {
      const scrollAmount = rect.top - viewportHeight / 2;
      window.scrollBy({ top: scrollAmount, behavior: "smooth" });
      await sleep(random(300, 700));
    }
  }

  // Find NEW like buttons (not processed yet)
  function findNewLikeButtons() {
    const likeButtons = [];
    const byAria = document.querySelectorAll('[aria-label="Like"]');

    for (const btn of byAria) {
      // Skip if button already processed
      if (btn.dataset.processed === "true") {
        continue;
      }

      // Skip if post container is marked as processed
      const postContainer =
        btn.closest('[role="article"]') ||
        btn.closest('[data-pagelet^="FeedUnit"]');
      if (postContainer) {
        if (postContainer.dataset.commentProcessed === "true") {
          continue;
        }

        // Check by post ID
        const postId = getPostId(btn);
        if (postId && processedPostIds.has(postId)) {
          continue;
        }

        // Check if "Liked" button exists (already liked)
        const likedButton = postContainer.querySelector(
          '[aria-label="Remove Like"], [aria-label="Unlike"]'
        );
        if (likedButton && btn === likedButton) {
          continue;
        }
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

  // Find close button
  function findCloseButton() {
    log("🔍 Looking for close button...");

    const allButtons = document.querySelectorAll('[role="button"]');

    for (const btn of allButtons) {
      const style = window.getComputedStyle(btn);

      const width = style.width;
      const height = style.height;
      const borderRadius = style.borderRadius;
      const bgColor = style.backgroundColor;

      const isCircular =
        borderRadius.includes("999px") || borderRadius.includes("50%");
      const isCorrectSize = width === "36px" && height === "36px";
      const hasSecondaryBg =
        bgColor === "rgb(226, 229, 233)" ||
        bgColor === "rgba(226, 229, 233, 1)";

      if (isCircular && isCorrectSize) {
        const isVisible =
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          btn.offsetParent !== null &&
          btn.offsetWidth > 0 &&
          btn.offsetHeight > 0;

        if (isVisible) {
          const ariaLabel = btn.getAttribute("aria-label");
          if (
            ariaLabel &&
            (ariaLabel.includes("Close") || ariaLabel.includes("close"))
          ) {
            log("✅ Found close button by aria-label");
            return btn;
          }

          const svg = btn.querySelector('svg[viewBox="0 0 24 24"]');
          if (svg) {
            const svgWidth = svg.getAttribute("width");
            const svgHeight = svg.getAttribute("height");

            if (svgWidth === "20" && svgHeight === "20") {
              const path = svg.querySelector("path");
              if (path) {
                const pathD = path.getAttribute("d");

                if (
                  pathD &&
                  pathD.includes("M19.884 5.884") &&
                  pathD.includes("1.768-1.768")
                ) {
                  log("✅ Found close button by exact SVG path");
                  return btn;
                }

                if (pathD && pathD.includes("12") && hasSecondaryBg) {
                  log("✅ Found close button by SVG cross pattern");
                  return btn;
                }
              }
            }
          }

          const anySvg = btn.querySelector("svg");
          if (anySvg) {
            const viewBox = anySvg.getAttribute("viewBox");
            const svgWidth = anySvg.getAttribute("width");
            const svgHeight = anySvg.getAttribute("height");

            if (
              viewBox === "0 0 24 24" &&
              svgWidth === "20" &&
              svgHeight === "20" &&
              hasSecondaryBg
            ) {
              log("✅ Found close button by SVG dimensions");
              return btn;
            }

            if (hasSecondaryBg) {
              log("✅ Found close button by style + SVG");
              return btn;
            }
          }

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

  // Like a post
  async function likePost(likeButton) {
    log(`👍 Liking post...`);
    await scrollToElementIfNeeded(likeButton);
    await randomDelay(300, 800);
    likeButton.click();
    likeButton.dataset.processed = "true";
    stats.liked++;
    log(`✅ Liked!`);
  }

  // Post comment - MODIFIED SCROLL SECTION
  async function postComment(commentButton, commentText, likeButton) {
    try {
      log("💬 Clicking comment button...");

      const postContainer =
        likeButton.closest('[role="article"]') ||
        likeButton.closest('[data-pagelet^="FeedUnit"]');
      const postId = getPostId(likeButton);

      // IMMEDIATE MARKING - Mark BEFORE doing anything
      if (postContainer) {
        postContainer.dataset.commentProcessed = "true";
        postContainer.dataset.alreadyCommented = "true";
        postContainer.style.border = "3px solid red"; // Strong visual marker
        log("🔒 Post PRE-marked to prevent duplicate");
      }
      if (postId) {
        processedPostIds.add(postId);
        log(`🔒 Post ID PRE-added to set`);
      }
      likeButton.dataset.processed = "true";
      likeButton.dataset.commented = "true";

      await scrollToElementIfNeeded(commentButton);
      await randomDelay(300, 800);

      commentButton.click();
      await randomDelay(2500, 3500);

      log("💬 Looking for comment input box...");

      let commentBox = null;

      commentBox = document.querySelector(
        'div[aria-label="Write a comment…"][data-lexical-editor="true"]'
      );

      if (commentBox) {
        log("💬 Found comment box by aria-label + data-lexical-editor");
      }

      if (!commentBox) {
        commentBox = document.querySelector(
          'div[role="textbox"][data-lexical-editor="true"]'
        );
        if (commentBox) {
          log("💬 Found comment box by role + data-lexical-editor");
        }
      }

      if (!commentBox) {
        commentBox = document.querySelector(
          'div[contenteditable="true"][data-lexical-editor="true"]'
        );
        if (commentBox) {
          log("💬 Found comment box by contenteditable + data-lexical-editor");
        }
      }

      if (!commentBox) {
        commentBox = document.querySelector(
          'div.xzsf02u.x1a2a7pz.x1n2onr6.x14wi4xw.notranslate[contenteditable="true"]'
        );
        if (commentBox) {
          log("💬 Found comment box by specific classes");
        }
      }

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

      log(`💬 Typing: "${commentText}"`);

      commentBox.focus();
      await randomDelay(400, 700);
      commentBox.click();
      await randomDelay(300, 600);

      commentBox.innerHTML = "";
      await randomDelay(200, 400);

      const paragraph = document.createElement("p");
      paragraph.className = "xdj266r x11i5rnm xat24cr x1mh8g0r x16tdsg8";
      paragraph.dir = "auto";

      const textSpan = document.createElement("span");
      textSpan.textContent = commentText;
      paragraph.appendChild(textSpan);

      commentBox.appendChild(paragraph);
      await randomDelay(300, 600);

      commentBox.innerText = commentText;
      commentBox.textContent = commentText;

      const events = [
        new Event("focus", { bubbles: true }),
        new Event("click", { bubbles: true }),
        new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: commentText,
        }),
        new Event("input", { bubbles: true }),
        new InputEvent("textInput", {
          bubbles: true,
          cancelable: true,
          data: commentText,
        }),
        new Event("change", { bubbles: true }),
        new Event("compositionend", { bubbles: true }),
      ];

      for (const event of events) {
        commentBox.dispatchEvent(event);
        await sleep(random(80, 150));
      }

      commentBox.focus();
      await randomDelay(200, 500);

      // Type character by character with random delays
      for (let char of commentText) {
        const keyDownEvent = new KeyboardEvent("keydown", {
          key: char,
          char: char,
          bubbles: true,
          cancelable: true,
        });
        commentBox.dispatchEvent(keyDownEvent);

        const keyPressEvent = new KeyboardEvent("keypress", {
          key: char,
          char: char,
          bubbles: true,
          cancelable: true,
        });
        commentBox.dispatchEvent(keyPressEvent);

        document.execCommand("insertText", false, char);

        const inputEvent = new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: char,
        });
        commentBox.dispatchEvent(inputEvent);

        const keyUpEvent = new KeyboardEvent("keyup", {
          key: char,
          char: char,
          bubbles: true,
          cancelable: true,
        });
        commentBox.dispatchEvent(keyUpEvent);

        await sleep(random(30, 100));
      }

      await randomDelay(800, 1500);

      const currentText = commentBox.innerText || commentBox.textContent || "";
      log(`💬 Current text in box: "${currentText}"`);

      log("⏎ Pressing Enter to submit comment...");

      commentBox.focus();
      await randomDelay(200, 500);

      const enterKeyDown = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
        composed: true,
      });
      commentBox.dispatchEvent(enterKeyDown);
      await sleep(random(80, 150));

      const enterKeyPress = new KeyboardEvent("keypress", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
        composed: true,
      });
      commentBox.dispatchEvent(enterKeyPress);
      await sleep(random(80, 150));

      const enterKeyUp = new KeyboardEvent("keyup", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
        composed: true,
      });
      commentBox.dispatchEvent(enterKeyUp);

      log("✅ Enter pressed! Comment submitted.");
      stats.commented++;
      await randomDelay(1500, 2500);

      log("❌ Looking for close button...");
      const closeBtn = findCloseButton();

      if (closeBtn) {
        log("❌ Clicking close button...");
        closeBtn.click();
        await randomDelay(400, 800);
        log("✅ Comment box closed!");
      } else {
        log("⚠️ Close button not found, trying Escape key...");

        const escapeEvent = new KeyboardEvent("keydown", {
          key: "Escape",
          code: "Escape",
          keyCode: 27,
          which: 27,
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(escapeEvent);
        await randomDelay(400, 800);
      }

      // ===== MODIFIED SECTION - SCROLL WITH CLICK =====

      // Final confirmation marking
      if (postContainer) {
        postContainer.dataset.commentProcessed = "true";
        postContainer.dataset.finalProcessed = "true";
        postContainer.style.opacity = "0.5";
        postContainer.style.border = "5px solid #FF0000";
        postContainer.style.pointerEvents = "none"; // Disable all interactions
        log("✅✅✅ Post FINAL marked and DISABLED");
      }

      likeButton.dataset.processed = "true";
      likeButton.dataset.commented = "true";
      likeButton.dataset.finalProcessed = "true";

      if (postId) {
        processedPostIds.add(postId);
        log(`✅ Post ID confirmed in set (Total: ${processedPostIds.size})`);
      }

      // Click somewhere else to remove focus from the post
      log("🖱️ Clicking outside to clear focus...");
      const bodyClick = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      document.body.dispatchEvent(bodyClick);
      await sleep(300);

      // Scroll down aggressively - LARGE AMOUNT
      const scrollAmount = random(800, 1200);
      log(
        `⬇️⬇️⬇️ Aggressively scrolling down ${scrollAmount}px to move past post...`
      );
      window.scrollBy({ top: scrollAmount, behavior: "smooth" });
      await sleep(500);

      // Extra click after scroll to ensure we're focused elsewhere
      log("🖱️ Extra click after scroll...");
      document.body.dispatchEvent(bodyClick);
      await sleep(300);

      // Another small scroll to ensure we're completely past the post
      const extraScroll = random(200, 400);
      log(`⬇️ Extra scroll ${extraScroll}px for safety...`);
      window.scrollBy({ top: extraScroll, behavior: "smooth" });
      await randomDelay(800, 1500);

      log(
        "🔒🔒🔒 Post locked and scrolled past - IMPOSSIBLE to comment again!"
      );

      return true;
    } catch (error) {
      log(`❌ Error posting comment: ${error.message}`);
      console.error("Comment error details:", error);
      return false;
    }
  }

  // Main auto liker + commenter with full randomization
  async function autoLikerCommenter(targetCount) {
    log(`=== Auto Liker + Commenter Started (RANDOMIZED MODE) ===`);
    log(`Target: ${targetCount} interactions`);
    log(`🎲 Random behaviors: Like only, Comment only, Both (random order)`);
    log(`🎲 Random delays, random comments, random scroll amounts`);
    log(`🔒 Triple protection: Container + Button + ID tracking`);

    let completedCount = 0;

    await randomDelay(1000, 2000);

    // Main loop
    while (completedCount < targetCount && isRunning) {
      // Random break time (3-7 seconds)
      const breakTime = random(3000, 7000);
      log(
        `\n⏸️ Random break (${(breakTime / 1000).toFixed(
          1
        )}s)... (${completedCount}/${targetCount} done)`
      );

      for (let i = 0; i < breakTime / 500; i++) {
        if (!isRunning) {
          log("🛑 Stopped by user during break");
          return;
        }
        await sleep(500);
      }

      if (!isRunning) break;

      // Random scroll amount (300-600px)
      const scrollAmount = random(300, 600);
      log(`⬇️ Scrolling down ${scrollAmount}px...`);
      window.scrollBy({ top: scrollAmount, behavior: "smooth" });
      await randomDelay(800, 1500);

      if (!isRunning) break;

      // Find new buttons
      const newButtons = findNewLikeButtons();

      if (newButtons.length > 0) {
        log(`🔍 Found ${newButtons.length} new post(s)`);

        const likeButton = newButtons[0];

        // Random action decision
        const actions = [
          "like_only",
          "comment_only",
          "both_like_first",
          "both_comment_first",
        ];
        const weights = [30, 20, 25, 25]; // Percentage weights

        // Weighted random choice
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let randomNum = random(1, totalWeight);
        let selectedAction = actions[0];

        for (let i = 0; i < actions.length; i++) {
          if (randomNum <= weights.slice(0, i + 1).reduce((a, b) => a + b, 0)) {
            selectedAction = actions[i];
            break;
          }
        }

        log(
          `🎲 Random action selected: ${selectedAction
            .toUpperCase()
            .replace(/_/g, " ")}`
        );

        await scrollToElementIfNeeded(likeButton);

        if (!isRunning) break;

        const commentButton = findCommentButton(likeButton);
        const randomComment = getRandomComment();

        // Execute random action
        switch (selectedAction) {
          case "like_only":
            await likePost(likeButton);
            stats.likedOnly++;
            // Mark as processed even if only liked
            const postContainer1 =
              likeButton.closest('[role="article"]') ||
              likeButton.closest('[data-pagelet^="FeedUnit"]');
            if (postContainer1) {
              postContainer1.dataset.commentProcessed = "true";
              const postId1 = getPostId(likeButton);
              if (postId1) processedPostIds.add(postId1);
            }
            break;

          case "comment_only":
            if (commentButton) {
              await postComment(commentButton, randomComment, likeButton);
              stats.commentedOnly++;
            } else {
              log(`⚠️ Comment button not found, skipping`);
            }
            break;

          case "both_like_first":
            await likePost(likeButton);
            await randomDelay(2000, 4000); // Random wait between actions
            if (commentButton) {
              await postComment(commentButton, randomComment, likeButton);
              stats.both++;
              stats.likeFirst++;
            } else {
              log(`⚠️ Comment button not found, skipping comment`);
              stats.likedOnly++;
            }
            break;

          case "both_comment_first":
            if (commentButton) {
              await postComment(commentButton, randomComment, likeButton);
              await randomDelay(1500, 3000); // Random wait
              await likePost(likeButton);
              stats.both++;
              stats.commentFirst++;
            } else {
              log(`⚠️ Comment button not found, doing like only`);
              await likePost(likeButton);
              stats.likedOnly++;
              const postContainer2 =
                likeButton.closest('[role="article"]') ||
                likeButton.closest('[data-pagelet^="FeedUnit"]');
              if (postContainer2) {
                postContainer2.dataset.commentProcessed = "true";
                const postId2 = getPostId(likeButton);
                if (postId2) processedPostIds.add(postId2);
              }
            }
            break;
        }

        if (!isRunning) break;

        completedCount++;

        await randomDelay(800, 1500);

        if (!isRunning) break;

        // Random skip (1-3 posts)
        const skipCount = random(1, 3);
        const skipScroll = random(600, 1000) * skipCount;
        log(`⏩ Randomly skipping ${skipCount} post(s) (${skipScroll}px)...`);
        window.scrollBy({ top: skipScroll, behavior: "smooth" });
        await randomDelay(800, 1500);
      } else {
        log("⚠️ No new posts found, scrolling more...");
        const extraScroll = random(500, 800);
        window.scrollBy({ top: extraScroll, behavior: "smooth" });
        await randomDelay(800, 1500);
      }
    }

    // Final statistics
    if (!isRunning) {
      log(`\n🛑 === STOPPED BY USER ===`);
    } else {
      log(`\n🎉 === COMPLETED ===`);
    }

    log(`✅ Total interactions: ${completedCount}`);
    log(`📊 Statistics:`);
    log(`   👍 Total Likes: ${stats.liked}`);
    log(`   💬 Total Comments: ${stats.commented}`);
    log(`   ➤ Like only: ${stats.likedOnly}`);
    log(`   ➤ Comment only: ${stats.commentedOnly}`);
    log(`   ➤ Both actions: ${stats.both}`);
    log(`   ➤ Like → Comment: ${stats.likeFirst}`);
    log(`   ➤ Comment → Like: ${stats.commentFirst}`);
    log(`📊 Total posts marked: ${processedPostIds.size}`);

    isRunning = false;
  }

  // Listen for start/stop commands
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.command === "start") {
      if (isRunning) {
        log("⚠️ Already running!");
        sendResponse({ status: "already_running" });
      } else {
        isRunning = true;
        // Reset stats
        stats = {
          liked: 0,
          commented: 0,
          likedOnly: 0,
          commentedOnly: 0,
          both: 0,
          likeFirst: 0,
          commentFirst: 0,
        };
        log("✅ Starting Auto Liker + Commenter (RANDOMIZED)...");
        log(`📊 Processed posts tracked: ${processedPostIds.size}`);
        autoLikerCommenter(request.count);
        sendResponse({ status: "started" });
      }
    } else if (request.command === "stop") {
      log("🛑 Stop command received");
      isRunning = false;
      sendResponse({ status: "stopped" });
    }
    return true;
  });

  log("Auto Liker + Commenter ready (RANDOMIZED VERSION)");
  log("🎲 Full randomization enabled for human-like behavior");
  log("🔒 Triple protection: Container + Button + ID tracking");
})();
