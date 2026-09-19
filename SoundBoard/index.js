//loop through all of the buttons and add event listener when each button is clicked
for (let i = 0; i < document.querySelectorAll(".btn").length; i++) {
    //add eventListener to each button
    document.querySelectorAll(".btn")[i].addEventListener("click", function()
    {
        //get the name of the sound you want
        let buttonName = this.dataset.sound;
        //call function to play
        playSound(buttonName);
    }
    );
}

//function to see which button was clicked to play the right sound for each
function playSound(buttonName) {
    switch(buttonName) {
        case "bruh":
            let bruh = new Audio("sounds/bruh.mp3");
            bruh.play();
            break;
        case "error":
            let error = new Audio("sounds/error.mp3");
            error.play();
            break;
        case "faah":
            let faah = new Audio("sounds/faaah.mp3");
            faah.play();
            break;
        case "huh":
            let huh = new Audio("sounds/huh.mp3");
            huh.play();
            break;
        case "omg":
            let omg = new Audio("sounds/omg.mp3");
            omg.play();
            break;
        case "oof":
            let oof = new Audio("sounds/oof.mp3");
            oof.play();
            break;
        case "rizz":
            let rizz = new Audio("sounds/rizz.mp3");
            rizz.play();
            break;
        case "roblox":
            let roblox = new Audio("sounds/roblox.mp3");
            roblox.play();
            break;
        case "stonks":
            let stonks = new Audio("sounds/stonks.mp3");
            stonks.play();
            break;
        case "tacobell":
            let tacobell = new Audio("sounds/taco-bell.mp3");
            tacobell.play();
            break;
        case "vine_boom":
            let vine = new Audio("sounds/vine-boom.mp3");
            vine.play();
            break;
        case "what_the_hell":
            let what_the_hell = new Audio("sounds/what-the-hell.mp3");
            what_the_hell.play();
            break;
        case "what_the_dog_doin":
            let what_the_dog_doin = new Audio("sounds/what_the_dog_doin.mp3");
            what_the_dog_doin.play();
            break;
        case "wow":
            let wow = new Audio("sounds/wow.mp3");
            wow.play();
            break;
        default:
            console.log();
    }
}