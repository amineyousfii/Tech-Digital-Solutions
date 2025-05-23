
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



menuButton.addEventListener('click', () => {
  navbar.classList.toggle('show');
  menuButton.classList.toggle('fa-close');
});

document.onscroll = () => {
  navbar.classList.remove('show');
  menuButton.classList.remove('fa-close');

  if (window.scrollY > 0) {
    document.querySelector('.header').classList.add('active');
  } else {
    document.querySelector('.header').classList.remove('active');
  }
};

document.onload = () => {
  if (window.scrollY > 0) {
    document.querySelector('.header').classList.add('active');
  } else {
    document.querySelector('.header').classList.remove('active');
  }
};


window.addEventListener('scroll', function() {
  const header = document.querySelector('.header');
  const defaultLogo = document.querySelector('.default-logo');
  const scrolledLogo = document.querySelector('.scrolled-logo');

  if (window.scrollY > 0) {
      header.classList.add('active');
      defaultLogo.style.display = 'none'; 
      scrolledLogo.style.display = 'block'; 
  } else {
      header.classList.remove('active');
      defaultLogo.style.display = 'block'; 
      scrolledLogo.style.display = 'none';
  }
});


document.addEventListener('DOMContentLoaded', function () {
  const testimonialsSlide = document.querySelector('.testimonials-slide');
  const totalWidth = testimonialsSlide.scrollWidth;
  testimonialsSlide.style.width = totalWidth + 'px';
});


const sliderTabs = document.querySelectorAll(".slider-tab");
const sliderIndicator = document.querySelector(".slider-indicator");
const sliderControls = document.querySelector(".slider-controls");

const updateIndicator = (tab, index) => {
   sliderIndicator.style.transform = `translateX(${tab.offsetLeft - 20}px)`;
   sliderIndicator.style.width = `${tab.getBoundingClientRect().width}px`;
   
   const scrollLeft = sliderTabs[index].offsetLeft - sliderControls.offsetWidth / 2 + sliderTabs[index].offsetWidth / 2;
   sliderControls.scrollTo({ left : scrollLeft, behaviour: "smooth"});
}

const swiper2 = new Swiper(".slider-container", {
   effect: "fade",
   speed: 1300,
   autoplay: { delay: 4000 }, 
   navigation: {
    prevEl: "#slide-prev",
    nextEl: "#slide-next",
   },
   on: {
     slideChange: () => {
      const currentTabIndex = [...sliderTabs].indexOf(sliderTabs[swiper2.activeIndex]);
      updateIndicator(sliderTabs[swiper2.activeIndex],currentTabIndex);
     },
     reachEnd : () => swiper2.autoplay.stop()
   }
});

sliderTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => {
     swiper2.slideTo(index);
     updateIndicator(tab, index);
  });
});

updateIndicator(sliderTabs[0], 0);
window.addEventListener("resize", () => updateIndicator(sliderTabs[swiper2.activeIndex], 0));

// Gsap Animations //

function animateContent(selector) {
  selector.forEach((selector) => {
      gsap.to(selector, {
          y: 30,
          duration: 0.1,
          opacity: 1,
          delay: 0.2,
          stagger: 0.2,
          ease: "power2.out",
      });
  });
}

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

function swipeAnimation(triggerSelector, boxSelectors) {
  const timeline = gsap.timeline({
      scrollTrigger: {
          trigger: triggerSelector,
          start: "top 50%",
          end: "top 100%",
          scrub: 3,
      },
  });

  boxSelectors.forEach((boxSelector) => {
      timeline.to(boxSelector, {
          x: 0,
          duration: 1,
          opacity:1,
      });
  });
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

scrollTriggerAnimation(".about", [".about .box1", ".about .box2"])
scrollTriggerAnimation(".contact", [".contact .box"])
galleryAnimation(".services", [".services .box1", ".services .box2", ".services .box3", ".services .box4", ".services .box5", ".services .box6"])
galleryAnimation(".works", [".works .box1", ".works .box2", ".works .box3", ".works .box4", ".works .box5", ".works .box6",])





// Chatbot // 


const API_KEY = "AIzaSyC-uGZcGeR3_Y7P5KoNQ5bvJny_GykMu3Y";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

const userData = {
    message: null,
    file: {
        data: null,
        mime_type: null
    }
}

const chatHistory = [
    {
      role: "model",
      parts: [{ text: `Welcome to Tech Digital Solutions! We provide affordable digital solutions, including web development, graphic design, and digital marketing, to help businesses grow. How can I assist you today? ` }],
    },
  ];
const initialInputHeight = messageInput.scrollHeight;


const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
} 

const generateBotResponse = async (incomingMessageDiv) => {
    const messageElement = incomingMessageDiv.querySelector(".message-text");


     chatHistory.push({
        role: "user",
        parts: [{ 
          text: `As Tech Digital Solutions, using the details provided above, please address this client query: ${userData.message}` 
        }, ...(userData.file?.data ? [{ inline_data: userData.file }] : [])],
      });
      


    const requestOptions = {
       method: "POST",
       headers: {"Content-Type": "application/json" },
       body: JSON.stringify({
         contents: chatHistory
       })  

    }
    try{
       const response = await fetch(API_URL, requestOptions);
       const data = await response.json();
       if(!response.ok) throw new Error(data.error.message);

  
       const apiResponseText = data.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, "$1").trim(); 
       messageElement.innerText = apiResponseText;

      
       chatHistory.push({
        role : "model", 
        parts: [{ text: apiResponseText}]
       });
    }catch (error){
        console.log(error);
        messageElement.innerText = error.message;
        messageElement.style.color = "#ff0000";
    } finally {
        userData.file = {};
        incomingMessageDiv.classList.remove("thinking");
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth"});
    }
}

const handleOutgoingMessage = (e) => {
  
    e.preventDefault();
    userData.message = messageInput.value.trim();
    messageInput.value = "";
    fileUploadWrapper.classList.remove("file-uploaded");
    messageInput.dispatchEvent(new Event("input"));

   
    const messageContent = `<div class="message-text"></div>
    ${userData.file.data ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="attachment" />` : ""}`;
    const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
    outgoingMessageDiv.querySelector(".message-text").textContent = userData.message;
    chatBody.appendChild(outgoingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth"});
 

    setTimeout(() => {
        const messageContent = `<svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
                    <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"></path>
                </svg> 
                <div class="message-text">
                    <div class="thinking-indicator">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                </div>`;
        const incomingMessageDiv = createMessageElement(messageContent, "bot-message", "thinking");
        chatBody.appendChild(incomingMessageDiv);
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth"});
        generateBotResponse(incomingMessageDiv);
    }, 600);
}

messageInput.addEventListener("keydown", (e) => {
    const userMessage = e.target.value.trim();
    if(e.key === "Enter" && userMessage && !e.shiftKey && window.innerWidth > 768){
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
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        fileUploadWrapper.querySelector("img").src = e.target.result;
        fileUploadWrapper.classList.add("file-uploaded");
        const base64String = e.target.result.split(",")[1];

        
        userData.file = {
            data: base64String,
            mime_type: file.type
        }
        
        fileInput.value = "";
    }
    reader.readAsDataURL(file);
});


fileCancelButton.addEventListener("click", () => {
   userData.file = {};
   fileUploadWrapper.classList.remove("file-uploaded");
});


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

sendMessageButton.addEventListener("click", (e) => handleOutgoingMessage(e));
document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());
chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));

closeChatbot.addEventListener("click", () => document.body.classList.remove("show-chatbot"));



let typed = new Typed (".auto-inputs", {
  strings: ["Affordable digital solutions for growth.", "Innovative web and branding services.", "All-in-one digital success strategies."],
  typeSpeed: 70,
  backSpeed: 30,
  loop: true
})



window.addEventListener('load', function () {
  const preloader = document.querySelector('.preloader');
  preloader.style.display = 'none';
});