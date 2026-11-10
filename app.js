
// Preloader: hide it as soon as the DOM is ready, with a hard fallback, and register this
// before any CDN-dependent setup below so a failed library can't keep the site covered.
const preloader = document.querySelector('.preloader');
const hidePreloader = () => { preloader.style.display = 'none'; };
document.addEventListener('DOMContentLoaded', hidePreloader);
setTimeout(hidePreloader, 3000);

const header = document.querySelector('.header');
const navbar = document.querySelector('.header .nav-links');
const menuButton = document.querySelector('.header .menu');

const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessageButton = document.querySelector("#send-message");
const fileInput = document.querySelector("#file-input");
const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
const fileCancelButton = document.querySelector("#file-cancel");
const chatbotToggler = document.querySelector("#chatbot-toggler");
const closeChatbot = document.querySelector("#close-chatbot");



const setMenuOpen = (open) => {
  navbar.classList.toggle('show', open);
  menuButton.classList.toggle('fa-close', open);
  menuButton.setAttribute('aria-expanded', open);
  menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
};

menuButton.addEventListener('click', () => setMenuOpen(!navbar.classList.contains('show')));

// The logo swap follows .header.active in style.css
const updateHeader = () => header.classList.toggle('active', window.scrollY > 0);

window.addEventListener('scroll', () => {
  if (navbar.classList.contains('show')) setMenuOpen(false);
  updateHeader();
});
updateHeader();


const sliderTabs = document.querySelectorAll(".slider-tab");
const sliderIndicator = document.querySelector(".slider-indicator");
const sliderControls = document.querySelector(".slider-controls");

const updateIndicator = (tab, index) => {
   sliderIndicator.style.transform = `translateX(${tab.offsetLeft - 20}px)`;
   sliderIndicator.style.width = `${tab.getBoundingClientRect().width}px`;

   const scrollLeft = sliderTabs[index].offsetLeft - sliderControls.offsetWidth / 2 + sliderTabs[index].offsetWidth / 2;
   sliderControls.scrollTo({ left : scrollLeft, behavior: "smooth"});
}

if (typeof Swiper !== "undefined") {
  const swiper2 = new Swiper(".slider-container", {
     effect: "fade",
     speed: 1300,
     autoplay: { delay: 4000 },
     navigation: {
      prevEl: "#slide-prev",
      nextEl: "#slide-next",
     },
     on: {
       slideChange: () => updateIndicator(sliderTabs[swiper2.activeIndex], swiper2.activeIndex),
       reachEnd : () => swiper2.autoplay.stop()
     }
  });

  sliderTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
       swiper2.slideTo(index);
       updateIndicator(tab, index);
    });
  });

  window.addEventListener("resize", () => updateIndicator(sliderTabs[swiper2.activeIndex], swiper2.activeIndex));
} else {
  // Without Swiper the slide copy would stay at its CSS starting state (opacity 0)
  document.querySelector(".slider-item").classList.add("swiper-slide-active");
}

updateIndicator(sliderTabs[0], 0);

// Gsap Animations //

function scrollTriggerAnimation(triggerSelector, boxSelectors) {
  const timeline = gsap.timeline({
      scrollTrigger: {
          trigger: triggerSelector,
          start: "top 50%",
          end: "top 80%",
          scrub: 1,
      },
  });

  boxSelectors.forEach((boxSelector) => {
      timeline.to(boxSelector, {
          y: 0,
          duration: 1,
          opacity: 1,
      });
  })
}

function galleryAnimation(triggerSelector, boxSelectors) {
  const timeline = gsap.timeline({
      scrollTrigger: {
          trigger: triggerSelector,
          start: "top 100%",
          end: "bottom 100%",
          scrub: 1,
      },
  });

  boxSelectors.forEach((boxSelector) => {
      timeline.to(boxSelector, {
          y: 0,
          opacity: 1,
          duration: 1,
      });
  });
}

if (typeof gsap !== "undefined") {
  scrollTriggerAnimation(".about", [".about .box1", ".about .box2"])
  scrollTriggerAnimation(".contact", [".contact .box"])
  galleryAnimation(".services", [".services .box1", ".services .box2", ".services .box3", ".services .box4", ".services .box5", ".services .box6"])
  galleryAnimation(".works", [".works .box1", ".works .box2", ".works .box3", ".works .box4", ".works .box5", ".works .box6",])
} else {
  // Without GSAP the boxes would stay at their CSS starting state (opacity 0, shifted down)
  document.querySelectorAll(".about .box, .services .box, .works .box, .contact .box").forEach((box) => {
    box.style.opacity = 1;
    box.style.transform = "none";
  });
}





// Chatbot //

// Messages go to our own proxy (worker/chat-proxy.js), which holds the Gemini key server-side.
// Set this to the URL `wrangler deploy` prints. While it is empty the chat button stays hidden,
// so the site never sends visitor messages to an address you don't control.
const CHAT_API_URL = "";
const REQUEST_TIMEOUT_MS = 20000;
const MAX_HISTORY_TURNS = 10;
// Must stay under MAX_BODY_BYTES in worker/chat-proxy.js once base64-encoded (x 4/3)
const MAX_FILE_BYTES = 4 * 1024 * 1024;
// Same list as ALLOWED_IMAGE_TYPES in worker/chat-proxy.js
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"];
const CHAT_UNAVAILABLE = "Sorry, the assistant is unavailable right now. Please use the contact form or email Techdigitalsolutions@gmail.com.";

const BOT_THINKING_MARKUP = `<svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
                    <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"></path>
                </svg>
                <div class="message-text">
                    <div class="thinking-indicator">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                </div>`;

let pendingFile = null;    // the attachment currently shown in the input, as { data, mime_type }
let fileSelectionId = 0;   // lets a FileReader result know it was cancelled or replaced while reading
let readingFile = false;   // a selected image is still being read, so sending now would drop it
let awaitingReply = false;
const chatHistory = [];    // text-only turns; an attachment is sent once, with its own message

const initialInputHeight = messageInput.scrollHeight;


const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}

const createUserMessage = (text, file) => {
    const div = document.createElement("div");
    div.classList.add("message", "user-message");
    const textDiv = document.createElement("div");
    textDiv.className = "message-text";
    textDiv.textContent = text;
    div.appendChild(textDiv);
    if (file) {
        const img = document.createElement("img");
        img.className = "attachment";
        img.src = `data:${file.mime_type};base64,${file.data}`;
        div.appendChild(img);
    }
    return div;
}

const clearAttachment = () => {
    fileSelectionId++;
    readingFile = false;
    pendingFile = null;
    fileUploadWrapper.classList.remove("file-uploaded");
}

// The proxy asks for plain text; this catches any Markdown that slips through
const toPlainText = (text) => text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^#{1,6}[ \t]+/gm, "")
    .replace(/^[ \t]*[*-][ \t]+/gm, "• ")
    .trim();

const generateBotResponse = async (incomingMessageDiv, message, file) => {
    const messageElement = incomingMessageDiv.querySelector(".message-text");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try{
       const response = await fetch(CHAT_API_URL, {
          method: "POST",
          headers: {"Content-Type": "application/json" },
          body: JSON.stringify({ message, file, history: chatHistory.slice(-MAX_HISTORY_TURNS) }),
          signal: controller.signal
       });
       const data = await response.json().catch(() => ({}));
       if(!response.ok || typeof data.reply !== "string") throw new Error(data.error || CHAT_UNAVAILABLE);

       const reply = toPlainText(data.reply);
       messageElement.innerText = reply;

       // Only completed, non-empty exchanges enter the history, so one bad turn can't break the next requests
       if (reply) chatHistory.push({ role: "user", text: message }, { role: "model", text: reply });
    }catch (error){
        console.error(error);
        // Our own errors carry a message meant for visitors; network and timeout errors don't
        messageElement.innerText = error.name === "Error" ? error.message : CHAT_UNAVAILABLE;
        messageElement.style.color = "#ff0000";
    } finally {
        clearTimeout(timeout);
        awaitingReply = false;
        sendMessageButton.disabled = false;
        incomingMessageDiv.classList.remove("thinking");
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth"});
    }
}

const handleOutgoingMessage = (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (!message || awaitingReply || readingFile) return;

    // Snapshot this message's attachment now, so a later send or upload can't swap it
    const file = pendingFile;
    awaitingReply = true;
    sendMessageButton.disabled = true;
    messageInput.value = "";
    clearAttachment();
    messageInput.dispatchEvent(new Event("input"));

    chatBody.appendChild(createUserMessage(message, file));
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth"});


    setTimeout(() => {
        const incomingMessageDiv = createMessageElement(BOT_THINKING_MARKUP, "bot-message", "thinking");
        chatBody.appendChild(incomingMessageDiv);
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth"});
        generateBotResponse(incomingMessageDiv, message, file);
    }, 600);
}

messageInput.addEventListener("keydown", (e) => {
    if(e.key === "Enter" && !e.shiftKey && !e.isComposing && window.innerWidth > 768){
        handleOutgoingMessage(e);
    }
});


messageInput.addEventListener("input", () => {
    messageInput.style.height = `${initialInputHeight}px`;
    messageInput.style.height = `${messageInput.scrollHeight}px`;
    document.querySelector(".chat-form").style.borderRadius = messageInput.scrollHeight > initialInputHeight ? "15px" : "32px";
})


fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    fileInput.value = "";
    if(!file) return;
    if(!ALLOWED_IMAGE_TYPES.includes(file.type) || file.size > MAX_FILE_BYTES) {
        alert(`Please choose a PNG, JPEG, WebP or HEIC image smaller than ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
        return;
    }

    const selectionId = ++fileSelectionId;
    readingFile = true;
    const reader = new FileReader();
    reader.onerror = () => {
        if (selectionId !== fileSelectionId) return;
        readingFile = false;
        alert("That image couldn't be read. Please try another one.");
    }
    reader.onload = (e) => {
        if (selectionId !== fileSelectionId) return;
        readingFile = false;
        fileUploadWrapper.querySelector("img").src = e.target.result;
        fileUploadWrapper.classList.add("file-uploaded");
        pendingFile = {
            data: e.target.result.split(",")[1],
            mime_type: file.type
        }
    }
    reader.readAsDataURL(file);
});


fileCancelButton.addEventListener("click", clearAttachment);


if (typeof EmojiMart !== "undefined") {
  const picker = new EmojiMart.Picker({
     theme: "light",
     skinTonePosition: "none",
     previewPosition: "none",
     onEmojiSelect: (emoji) => {
       const { selectionStart: start, selectionEnd: end} = messageInput;
       messageInput.setRangeText(emoji.native, start, end, "end");
       messageInput.focus();
     },
     onClickOutside: (e) => {
      if(e.target.id === "emoji-picker") {
          document.body.classList.toggle("show-emoji-picker");
      } else {
          document.body.classList.remove("show-emoji-picker");
      }
     }
  });

  document.querySelector(".chat-form").appendChild(picker);
} else {
  document.querySelector("#emoji-picker").hidden = true;
}

sendMessageButton.addEventListener("click", (e) => handleOutgoingMessage(e));
document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());
const setChatOpen = (open) => {
  document.body.classList.toggle("show-chatbot", open);
  chatbotToggler.setAttribute("aria-expanded", open);
  chatbotToggler.setAttribute("aria-label", open ? "Close chat assistant" : "Open chat assistant");
  // Move focus with the popup so keyboard users aren't left on a hidden control;
  // wait for the popup's 0.1 s visibility transition before focusing inside it
  if (open) setTimeout(() => messageInput.focus(), 150);
}

chatbotToggler.addEventListener("click", () => setChatOpen(!document.body.classList.contains("show-chatbot")));

closeChatbot.addEventListener("click", () => {
  setChatOpen(false);
  chatbotToggler.focus();
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (document.body.classList.contains("show-chatbot")) {
    setChatOpen(false);
    chatbotToggler.focus();
  } else if (navbar.classList.contains("show")) {
    setMenuOpen(false);
    menuButton.focus();
  }
});

// No proxy configured yet: hide the chat entirely rather than send messages nowhere (see CHAT_API_URL)
if (!CHAT_API_URL) chatbotToggler.style.display = "none";



const typedStrings = ["Affordable digital solutions for growth.", "Innovative web and branding services.", "All-in-one digital success strategies."];
if (typeof Typed !== "undefined") {
  new Typed (".auto-inputs", {
    strings: typedStrings,
    typeSpeed: 70,
    backSpeed: 30,
    loop: true
  })
} else {
  document.querySelector(".auto-inputs").textContent = typedStrings[0];
}
