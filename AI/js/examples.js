window.EXAMPLES = {

nova: {
 name: "Nova Store Assistant",
 about: "Try it: Test -> Check my order -> type ORD-1024. Free-text questions fall back to the AI brain using the knowledge base.",
 store: {
  name: "Nova Assistant",
  fallback: "Sorry, I didn't quite catch that. Could you rephrase it?",
  speed: 600,
  ai: {mode:"hybrid",model:"openai",kb:"Nova Store. Hours: Mon–Sat 9am–8pm, Sun 10am–6pm.\nShipping: free over $50, same-day dispatch, 2–3 business days.\nRefunds: accepted within 30 days, no questions asked.\nPlans: Standard $19/mo, Pro $49/mo with priority support.\nOrders: start with ORD-, e.g. ORD-1024."},
  triggers: [
   {keywords:"human,agent,representative,person",nodeId:"t1",message:"One moment, I'll get you a real human."},
   {keywords:"hi,hello,hey,yo,sup",nodeId:"s2",message:""}
  ]
 },
 nodes: [
  {id:"s1",type:"start",label:"Start",x:100,y:210,content:"Hi, I'm Nova — your store assistant. I can track orders, share hours and run refunds.",hint:"",mode:"options",branches:[{label:"",target:"s2",match:""}],action:{type:"webhook",url:"",email:"",subject:"",message:""}},
  {id:"s2",type:"message",label:"Intro",x:400,y:210,content:"Ask me about an order, store hours, or returns. Type 'human' anytime to talk to a person.",hint:"",mode:"options",branches:[{label:"",target:"s3",match:""}],action:{type:"webhook",url:"",email:"",subject:"",message:""}},
  {id:"s3",type:"question",label:"Main menu",x:700,y:210,content:"What would you like help with today?",hint:"",mode:"options",branches:[{label:"Check my order",target:"s4",match:""},{label:"Store hours",target:"s5",match:""},{label:"Start a refund",target:"s6",match:""},{label:"Just browsing",target:"s7",match:""}],action:{type:"webhook",url:"",email:"",subject:"",message:""}},
  {id:"s4",type:"question",label:"Order lookup",x:1000,y:120,content:"Please type your order number, e.g. ORD-1024.",hint:"It starts with ORD-",mode:"free",branches:[{label:"found",target:"s8",match:"ord-"}],action:{type:"webhook",url:"",email:"",subject:"",message:""}},
  {id:"s5",type:"message",label:"Store hours",x:1000,y:420,content:"We're open Mon–Sat 9am–8pm and Sun 10am–6pm. Closed public holidays.",hint:"",mode:"options",branches:[{label:"",target:"s10",match:""}],action:{type:"webhook",url:"",email:"",subject:"",message:""}},
  {id:"s6",type:"question",label:"Refunds",x:700,y:470,content:"Tell me a bit about the issue. Including your ORD- number speeds things up.",hint:"Include the ORD- number if you have it",mode:"free",branches:[{label:"refund route",target:"s11",match:"ord-"}],action:{type:"webhook",url:"",email:"",subject:"",message:""}},
  {id:"s7",type:"message",label:"Browsing",x:700,y:760,content:"Feel free to browse. Ask me for product details or check out this week's deals.",hint:"",mode:"options",branches:[{label:"",target:"s10",match:""}],action:{type:"webhook",url:"",email:"",subject:"",message:""}},
  {id:"s8",type:"action",label:"Fetch order",x:1300,y:100,content:"Fetching your order from the warehouse system…",hint:"",mode:"options",branches:[{label:"",target:"s12",match:""}],action:{type:"webhook",url:"https://api.example.com/orders",email:"",subject:"",message:"ORDER_LOOKUP"}},
  {id:"s9",type:"message",label:"Bad input",x:1300,y:320,content:"That doesn't look like a valid order number — please double-check it.",hint:"",mode:"options",branches:[{label:"",target:"s4",match:""}],action:{type:"webhook",url:"",email:"",subject:"",message:""}},
  {id:"s10",type:"message",label:"Anything else?",x:1000,y:620,content:"Anything else I can help you with?",hint:"",mode:"options",branches:[{label:"",target:"s3",match:""}],action:{type:"webhook",url:"",email:"",subject:"",message:""}},
  {id:"s11",type:"action",label:"Refund request",x:1000,y:720,content:"Submitting your refund request…",hint:"",mode:"options",branches:[{label:"",target:"s13",match:""}],action:{type:"webhook",url:"https://api.example.com/refunds",email:"support@example.com",subject:"Refund request",message:"REFUND_REQUEST"}},
  {id:"s12",type:"message",label:"Order found",x:1600,y:100,content:"Found it! Your order shipped today and should arrive in 2–3 business days.",hint:"",mode:"options",branches:[{label:"",target:"s10",match:""}],action:{type:"webhook",url:"",email:"",subject:"",message:""}},
  {id:"s13",type:"message",label:"Refund submitted",x:1300,y:800,content:"Your refund request is in. You'll get a confirmation email within the hour.",hint:"",mode:"options",branches:[{label:"",target:"s10",match:""}],action:{type:"webhook",url:"",email:"",subject:"",message:""}},
  {id:"t1",type:"message",label:"Human handoff",x:1300,y:540,content:"No problem — connecting you with a human agent now. Please hold on the line.",hint:"",mode:"options",branches:[]}
 ]
},

pizza: {
 name: "Pizza Bandit",
 about: "Try it: Test -> Order a pizza -> pick a size -> type pepperoni. An action node fires a webhook when the order is placed.",
 store: {
  name: "Paulo at Pizza Bandit",
  fallback: "I didn't catch that — try typing pizza words like pepperoni, mushroom or cheese, or pick an option below.",
  speed: 600,
  ai: {mode:"hybrid",model:"openai",kb:"Pizza Bandit. Pizzas: small $9, medium $12, large $15. Toppings: pepperoni, mushrooms, olives, extra cheese, pineapple. Free delivery over $20 within 5 km. Delivery takes 35–45 minutes. Open daily 11am–11pm."},
  triggers: [
   {keywords:"human,agent,person",nodeId:"p6",message:"One second, connecting you to a person."},
   {keywords:"hi,hello,hey,yo",nodeId:"p2",message:""}
  ]
 },
 nodes: [
  {id:"p1",type:"start",label:"Start",x:100,y:240,content:"Hey, I'm Paulo — Pizza Bandit's ordering bot. I can take your order, check delivery time, or get you a human.",hint:"",mode:"options",branches:[{label:"",target:"p2",match:""}],action:{type:"webhook",url:"",email:"",subject:"",message:""}},
  {id:"p2",type:"message",label:"Welcome",x:400,y:240,content:"Pizzas from $9, free delivery over $20 within 5 km. Let's get you a pie!",hint:"",mode:"options",branches:[{label:"",target:"p3",match:""}],action:{type:"webhook",url:"",email:"",subject:"",message:""}},
  {id:"p3",type:"question",label:"Main menu",x:700,y:240,content:"What would you like to do?",hint:"",mode:"options",branches:[{label:"Order a pizza",target:"p4",match:""},{label:"Check delivery time",target:"p5",match:""},{label:"Talk to a human",target:"p6",match:""}],action:{type:"webhook",url:"",email:"",subject:"",message:""}},
  {id:"p4",type:"question",label:"Size",x:1020,y:130,content:"Which size would you like?",hint:"",mode:"options",branches:[{label:"Small ($9)",target:"p7",match:""},{label:"Medium ($12)",target:"p7",match:""},{label:"Large ($15)",target:"p7",match:""}],action:{type:"webhook",url:"",email:"",subject:"",message:""}},
  {id:"p7",type:"question",label:"Toppings",x:1020,y:430,content:"What toppings would you like?",hint:"Try typing: pepperoni, mushrooms, cheese",mode:"free",branches:[{label:"top ok",target:"p8",match:"pepperoni"},{label:"top ok",target:"p8",match:"mushroom"},{label:"top ok",target:"p8",match:"cheese"}],action:{type:"webhook",url:"",email:"",subject:"",message:""}},
  {id:"p8",type:"action",label:"Place order",x:1340,y:430,content:"Locking in your order with the kitchen…",hint:"",mode:"options",branches:[{label:"",target:"p9",match:""}],action:{type:"webhook",url:"https://api.example.com/pizza-orders",email:"kitchen@pizzabandit.com",subject:"New pizza order",message:"PIZZA_ORDER"}},
  {id:"p9",type:"message",label:"Confirmation",x:1660,y:430,content:"Order locked in! ETA around 35 minutes. You'll get a confirmation text when it's out for delivery.",hint:"",mode:"options",branches:[{label:"",target:"p10",match:""}],action:{type:"webhook",url:"",email:"",subject:"",message:""}},
  {id:"p10",type:"message",label:"Anything else?",x:1340,y:140,content:"Anything else? I'm here all evening.",hint:"",mode:"options",branches:[{label:"",target:"p3",match:""}],action:{type:"webhook",url:"",email:"",subject:"",message:""}},
  {id:"p5",type:"message",label:"Delivery time",x:1020,y:700,content:"Right now delivery runs 35–45 minutes. It's free over $20 and within 5 km.",hint:"",mode:"options",branches:[{label:"",target:"p10",match:""}],action:{type:"webhook",url:"",email:"",subject:"",message:""}},
  {id:"p6",type:"message",label:"Human handoff",x:700,y:640,content:"No problem — connecting you with a real person at the counter. Hold the line!",hint:"",mode:"options",branches:[],action:{type:"webhook",url:"",email:"",subject:"",message:""}}
 ]
}

};