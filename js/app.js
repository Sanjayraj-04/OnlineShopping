// ============================================
// SHOP EZ — SINGLE FILE FRONTEND
// Firestore REST API integration (demo setup)
// ============================================
const PROJECT_ID = "shopez-7eaaa";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const ADMIN_EMAIL = "sanjayraj2809@gmail.com";
const ADMIN_PASSWORD = "Shopez@2809"; // DEMO ONLY: visible in browser source; do not use for production.
let products=[], categories=[], customers=[], orders=[], cart=[], editingProductId=null;
let currentRole="customer";
let currentCustomerName="";

function toast(message){const el=document.getElementById("toast");el.textContent=message;el.classList.remove("hidden");setTimeout(()=>el.classList.add("hidden"),2600)}
function renderRoleNavigation(){
  const nav = document.getElementById("topNavigation");
  if(!nav) return;

  if(currentRole === "customer"){
    nav.innerHTML = `
      <span class="muted">Customer: ${escapeHtml(currentCustomerName || "Shopper")}</span>
      <button onclick="showView('shop')">Shop</button>
      <button onclick="showCart()">Cart <b id="cartCount">${cart.reduce((n,x)=>n+x.quantity,0)}</b></button>
      <button onclick="logout()">Logout</button>`;
  } else if(currentRole === "admin"){
    nav.innerHTML = `
      <span class="muted">Admin workspace</span>
      <button onclick="showView('admin')">Dashboard</button>
      <button onclick="logout()">Logout</button>`;
  } else {
    nav.innerHTML = "";
  }
}

function showView(view){
  ["entryView","shopView","loginView","adminLoginView","adminView"].forEach(id=>{
    document.getElementById(id)?.classList.add("hidden");
  });

  if(view === "customerLogin"){
    document.getElementById("loginView").classList.remove("hidden");
    renderRoleNavigation();
  } else if(view === "adminLogin"){
    document.getElementById("adminLoginView").classList.remove("hidden");
    renderRoleNavigation();
  } else if(view === "shop" && currentRole === "customer"){
    document.getElementById("shopView").classList.remove("hidden");
    document.getElementById("siteFooter")?.classList.remove("hidden");
    renderRoleNavigation();
    loadStorefront();
  } else if(view === "admin" && currentRole === "admin"){
    document.getElementById("adminView").classList.remove("hidden");
    document.getElementById("siteFooter")?.classList.remove("hidden");
    renderRoleNavigation();
    refreshAll();
    adminSection("overview", document.querySelector(".side-btn"));
  } else if(view === "entry"){
    document.getElementById("entryView").classList.remove("hidden");
    document.getElementById("siteFooter")?.classList.add("hidden");
    renderRoleNavigation();
  } else {
    document.getElementById("entryView").classList.remove("hidden");
    document.getElementById("siteFooter")?.classList.add("hidden");
    renderRoleNavigation();
  }
  window.scrollTo({top: 0, behavior: "smooth"});
}


async function loadStorefront(){
  try{
    [products, categories] = await Promise.all([
      listDocs("products"),
      listDocs("categories")
    ]);
    renderProducts();
    renderCategoryOptions();
  }catch(e){
    toast("Could not load products: " + (e.response?.data?.error?.message || e.message));
  }
}
function logout(){
  currentRole = "";
  currentCustomerName = "";
  cart = [];
  updateCartCount();
  document.getElementById("siteFooter")?.classList.add("hidden");
  showView("entry");
}

function setCartCount(){
  const counter = document.getElementById("cartCount");
  if(counter) counter.textContent = cart.reduce((n,item)=>n+item.quantity,0);
}
function showCart(){document.getElementById("cartPanel").classList.remove("hidden");renderCart();document.getElementById("cartPanel").scrollIntoView({behavior:"smooth"})}
function hideCart(){document.getElementById("cartPanel").classList.add("hidden")}
function customerLogin(event){
  event.preventDefault();
  const username = document.getElementById("customerUsername").value.trim();
  const password = document.getElementById("customerPassword").value;
  if(!username || !password){toast("Enter a username and password");return}
  currentCustomerName = username;
  currentRole = "customer";
  document.getElementById("siteFooter")?.classList.remove("hidden");
  showView("shop");
  toast("Customer login successful");
}

function adminLogin(event){
  event.preventDefault();
  const username = document.getElementById("adminUsername").value.trim().toLowerCase();
  const password = document.getElementById("adminPassword").value;
  if(username === ADMIN_EMAIL && password === ADMIN_PASSWORD){
    currentRole = "admin";
    currentCustomerName = "";
    document.getElementById("siteFooter")?.classList.remove("hidden");
    showView("admin");
    toast("Admin login successful");
  } else {
    toast("Invalid admin email or password");
  }
}
function encodeFields(data){const fields={};for(const [k,v] of Object.entries(data)){if(v===undefined)continue;if(typeof v==="string")fields[k]={stringValue:v};else if(typeof v==="boolean")fields[k]={booleanValue:v};else if(Number.isInteger(v))fields[k]={integerValue:String(v)};else if(typeof v==="number")fields[k]={doubleValue:v};else fields[k]={stringValue:JSON.stringify(v)}}return fields}
function decodeValue(v){if(v.stringValue!==undefined)return v.stringValue;if(v.integerValue!==undefined)return Number(v.integerValue);if(v.doubleValue!==undefined)return Number(v.doubleValue);if(v.booleanValue!==undefined)return v.booleanValue;if(v.nullValue!==undefined)return null;return ""}
function decodeDoc(doc){const obj={};for(const [k,v] of Object.entries(doc.fields||{}))obj[k]=decodeValue(v);return obj}
async function listDocs(name){try{const r=await axios.get(`${BASE}/${name}`);return(r.data.documents||[]).map(decodeDoc)}catch(e){if(e.response?.status===404)return[];throw e}}
async function getDoc(name,id){const r=await axios.get(`${BASE}/${name}/${encodeURIComponent(id)}`);return decodeDoc(r.data)}
async function createDoc(name,id,data){await axios.post(`${BASE}/${name}?documentId=${encodeURIComponent(id)}`,{fields:encodeFields({...data,id})})}
async function patchDoc(name,id,data){const params=new URLSearchParams();Object.keys(data).forEach(k=>params.append("updateMask.fieldPaths",k));const fields=encodeFields(data);await axios.patch(`${BASE}/${name}/${encodeURIComponent(id)}?${params}`,{fields})}
async function deleteDoc(name,id){await axios.delete(`${BASE}/${name}/${encodeURIComponent(id)}`)}
function safe(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function categoryName(id){return categories.find(c=>c.id===id)?.name||id||"Uncategorised"}
function iconFor(p){const t=(p.title||"").toLowerCase();if(t.includes("shoe"))return"👟";if(t.includes("shirt")||t.includes("tee"))return"👕";if(t.includes("bag"))return"👜";if(t.includes("watch"))return"⌚";return"◈"}
async function refreshAll(){
  try{
    [products,categories,customers,orders]=await Promise.all([listDocs("products"),listDocs("categories"),listDocs("customers"),listDocs("orders")]);
    renderProducts();renderAdminTables();renderCategoryOptions();
    document.getElementById("statProducts").textContent=products.length;
    document.getElementById("statCategories").textContent=categories.length;
    document.getElementById("statCustomers").textContent=customers.length;
    document.getElementById("statOrders").textContent=orders.length;
    document.getElementById("reportCustomers").textContent=customers.length;
    document.getElementById("reportStock").textContent=products.reduce((n,p)=>n+Number(p.qty||0),0);
    document.getElementById("reportHigh").textContent=products.filter(p=>Number(p.qty)>100).length;
    document.getElementById("reportLow").textContent=products.filter(p=>Number(p.qty)<15).length;
  }catch(e){toast("Could not load Firestore data: "+(e.response?.data?.error?.message||e.message))}
}
function renderProducts(){
  const q=(document.getElementById("searchBox")?.value||"").toLowerCase(),cat=document.getElementById("categoryFilter")?.value||"";
  const filtered=products.filter(p=>(!p.active||p.active===true)&&(!cat||p.cat_id===cat)&&(`${p.title||""} ${p.des||""}`).toLowerCase().includes(q));
  document.getElementById("productCount").textContent=`${filtered.length} items`;
  document.getElementById("productGrid").innerHTML=filtered.map(p=>`<article class="product"><div class="product-visual">${p.image_url?`<img src="${safe(p.image_url)}" alt="${safe(p.title)}" loading="lazy" onerror="this.style.display='none';this.parentElement.textContent='${iconFor(p)}'">`:iconFor(p)}</div><div class="product-body"><span class="tag">${safe(categoryName(p.cat_id))}</span><h3>${safe(p.title)}</h3><p class="muted">${safe(p.des||"Everyday essential")}</p><div class="product-foot"><span class="price">₹${Number(p.price||0).toLocaleString("en-IN")}</span><button class="primary" onclick="addToCart('${safe(p.id)}')">Add +</button></div></div></article>`).join("")||`<div class="panel">No products found. Add products from the Admin workspace.</div>`;
}

// Add sample catalogue records to Firestore. Existing IDs are left untouched.
async function seedDemoProducts(){
  const samples=[
    {id:"prod_002",title:"White Oversized T-Shirt",des:"Soft cotton oversized tee for everyday wear",price:699,qty:35,image_url:"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900&q=85"},
    {id:"prod_003",title:"Classic Black Hoodie",des:"Comfortable fleece hoodie with a clean fit",price:1499,qty:24,image_url:"https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=900&q=85"},
    {id:"prod_004",title:"Blue Denim Jeans",des:"Everyday straight-fit blue denim jeans",price:1299,qty:28,image_url:"https://images.unsplash.com/photo-1542272604-787c3835535d?w=900&q=85"},
    {id:"prod_005",title:"White Everyday Sneakers",des:"Minimal low-top sneakers for daily styling",price:1999,qty:18,image_url:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=85"},
    {id:"prod_006",title:"Casual Overshirt",des:"Versatile layer for relaxed everyday outfits",price:1599,qty:16,image_url:"https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=900&q=85"},
    {id:"prod_007",title:"Everyday Wrist Watch",des:"Clean dial watch with a timeless design",price:2499,qty:12,image_url:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&q=85"},
    {id:"prod_008",title:"Minimal Crossbody Bag",des:"Compact everyday bag with practical storage",price:999,qty:22,image_url:"https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=900&q=85"},
    {id:"prod_009",title:"Linen Casual Shirt",des:"Lightweight button-down shirt for warm days",price:1199,qty:20,image_url:"https://images.unsplash.com/photo-1603252110481-7ba45d7ab0e2?w=900&q=85"}
  ];
  const existing=new Set(products.map(p=>p.id));
  let added=0;
  try{
    for(const item of samples){
      if(existing.has(item.id)) continue;
      await createDoc("products",item.id,{...item,cat_id:"cat_001",active:true});
      added++;
    }
    await refreshAll();
    toast(added?`${added} sample products added with image links`:"Sample products already exist");
  }catch(e){
    toast("Could not add sample products: "+(e.response?.data?.error?.message||e.message));
  }
}

function renderCategoryOptions(){
  const options=categories.map(c=>`<option value="${safe(c.id)}">${safe(c.name||c.id)}</option>`).join("");
  document.getElementById("categoryFilter").innerHTML='<option value="">All categories</option>'+options;
  document.getElementById("pCategory").innerHTML=options;
}
function addToCart(id){const p=products.find(x=>x.id===id);if(!p)return;if(Number(p.qty||0)<=0){toast("This item is out of stock");return}const found=cart.find(x=>x.id===id);if(found){if(found.quantity>=Number(p.qty)){toast("Stock limit reached");return}found.quantity++}else cart.push({id,title:p.title,price:Number(p.price||0),quantity:1});setCartCount();toast("Added to your bag")}
function renderCart(){
  const box=document.getElementById("cartContents");
  box.innerHTML=cart.map(x=>`<div class="product-foot" style="padding:12px 0;border-bottom:1px solid var(--line)"><div><strong>${safe(x.title)}</strong><div class="muted">₹${x.price} × ${x.quantity}</div></div><div class="actions"><button class="small-btn" onclick="changeQty('${x.id}',-1)">−</button><button class="small-btn" onclick="changeQty('${x.id}',1)">+</button><button class="small-btn danger" onclick="removeCart('${x.id}')">Remove</button></div></div>`).join("")||'<p class="muted">Your bag is empty.</p>';
  const total=cart.reduce((n,x)=>n+x.price*x.quantity,0);document.getElementById("cartTotal").textContent="Total: ₹"+total.toLocaleString("en-IN");
}
function changeQty(id,d){const x=cart.find(x=>x.id===id),p=products.find(p=>p.id===id);if(!x)return;x.quantity+=d;if(x.quantity<=0)cart=cart.filter(a=>a.id!==id);else if(x.quantity>Number(p?.qty||0)){x.quantity--;toast("Stock limit reached")}setCartCount();renderCart()}
function removeCart(id){cart=cart.filter(x=>x.id!==id);setCartCount();renderCart()}
function openCheckout(){
  if(!cart.length){toast("Your bag is empty");return}
  const total=cart.reduce((n,x)=>n+x.price*x.quantity,0);
  document.getElementById("checkoutTotal").textContent="₹"+total.toLocaleString("en-IN");
  document.getElementById("checkoutModal").classList.remove("hidden");
  const savedEmail=localStorage.getItem("shopez_customer_email")||"";
  if(savedEmail) document.getElementById("checkoutEmail").value=savedEmail;
  updateCreditHint();
}
function closeCheckout(){document.getElementById("checkoutModal").classList.add("hidden")}
async function updateCreditHint(){
  const email=document.getElementById("checkoutEmail").value.trim().toLowerCase();
  const hint=document.getElementById("creditAvailability");
  if(!email){hint.textContent="Enter your registered email to check credit availability.";return}
  try{
    const match=customers.find(c=>(c.email||"").toLowerCase()===email);
    if(!match){hint.textContent="No customer account found for this email. Credit payment is unavailable.";return}
    const limit=Number(match.credit_limit||0),used=Number(match.credit_used||0);
    hint.textContent=`Available credit: ₹${Math.max(0,limit-used).toLocaleString("en-IN")}`;
  }catch(e){hint.textContent="Could not check credit availability."}
}
document.addEventListener("input",e=>{if(e.target?.id==="checkoutEmail")updateCreditHint()});
async function submitCheckout(event){
  event.preventDefault();
  if(!cart.length){toast("Your bag is empty");closeCheckout();return}
  const name=document.getElementById("checkoutName").value.trim();
  const email=document.getElementById("checkoutEmail").value.trim().toLowerCase();
  const mob=document.getElementById("checkoutMobile").value.trim();
  const city=document.getElementById("checkoutCity").value.trim();
  const address=document.getElementById("checkoutAddress").value.trim();
  const method=document.querySelector('input[name="paymentMethod"]:checked')?.value||"Cash";
  const total=cart.reduce((n,x)=>n+x.price*x.quantity,0);
  if(!name||!email||!mob||!city||!address){toast("Complete all delivery details");return}
  let customer=customers.find(c=>(c.email||"").toLowerCase()===email);
  if(!customer){
    const customerId="cust_"+Date.now();
    customer={id:customerId,name,email,mob,credit_limit:0,credit_used:0};
    try{await createDoc("customers",customerId,customer);customers.push(customer)}
    catch(e){toast("Could not create customer record: "+(e.response?.data?.error?.message||e.message));return}
  }
  if(method==="Credit"){
    const available=Math.max(0,Number(customer.credit_limit||0)-Number(customer.credit_used||0));
    if(total>available){toast(`Insufficient credit. Available: ₹${available.toLocaleString("en-IN")}`);return}
  }
  for(const item of cart){const p=products.find(x=>x.id===item.id);if(!p||Number(p.qty||0)<item.quantity){toast(`Insufficient stock for ${item.title}`);return}}
  const orderId="ord_"+Date.now();
  const paymentId="pay_"+Date.now();
  const now=new Date().toISOString();
  const order={id:orderId,customer_id:customer.id,customer_name:name,customer_email:email,mob,delivery_city:city,delivery_address:address,items:JSON.stringify(cart.map(x=>({product_id:x.id,title:x.title,quantity:x.quantity,price:x.price}))),total_amount:total,payment_method:method,status:"Pending",created_at:now};
  const payment={id:paymentId,order_id:orderId,customer_id:customer.id,amount:total,payment_method:method,payment_status:method==="Cash"?"Pending":"Due",created_at:now};
  const button=document.getElementById("confirmOrderButton");button.disabled=true;button.textContent="Placing order…";
  try{
    await createDoc("orders",orderId,order);
    await createDoc("payments",paymentId,payment);
    for(const item of cart){const p=products.find(x=>x.id===item.id);await patchDoc("products",item.id,{qty:Math.max(0,Number(p.qty)-item.quantity)})}
    if(method==="Credit"){
      const newUsed=Number(customer.credit_used||0)+total;
      await patchDoc("customers",customer.id,{credit_used:newUsed});
    }
    localStorage.setItem("shopez_customer_email",email);
    cart=[];setCartCount();renderCart();closeCheckout();await refreshAll();
    toast(`Order ${orderId} placed · ${method} payment`);
  }catch(e){toast("Order could not be completed: "+(e.response?.data?.error?.message||e.message))}
  finally{button.disabled=false;button.textContent="Confirm order"}
}

function adminSection(section,btn){
  ["overview","products","categories","customers","orders","reports"].forEach(s=>document.getElementById("admin"+s[0].toUpperCase()+s.slice(1)).classList.toggle("hidden",s!==section));
  document.querySelectorAll(".side-btn").forEach(b=>b.classList.remove("active"));if(btn)btn.classList.add("active");
}
function renderAdminTables(){
  document.getElementById("adminProductRows").innerHTML=products.map(p=>`<tr><td>${safe(p.id)}</td><td><strong>${safe(p.title)}</strong><br><span class="muted">${safe(p.des||"")}</span></td><td>${safe(categoryName(p.cat_id))}</td><td>₹${Number(p.price||0)}</td><td>${Number(p.qty||0)}</td><td><div class="actions"><button class="small-btn" onclick="editProduct('${safe(p.id)}')">Edit</button><button class="small-btn danger" onclick="removeProduct('${safe(p.id)}')">Delete</button></div></td></tr>`).join("")||'<tr><td colspan="6">No products yet.</td></tr>';
  document.getElementById("categoryRows").innerHTML=categories.map(c=>`<tr><td>${safe(c.id)}</td><td>${safe(c.name||"")}</td><td><button class="small-btn danger" onclick="removeCategory('${safe(c.id)}')">Delete</button></td></tr>`).join("")||'<tr><td colspan="3">No categories yet.</td></tr>';
  document.getElementById("customerRows").innerHTML=customers.map(c=>`<tr><td>${safe(c.id)}</td><td>${safe(c.name)}</td><td>${safe(c.email)}</td><td>${safe(c.mob)}</td><td>₹${Number(c.credit_limit||0)}</td><td>₹${Number(c.credit_used||0)}</td></tr>`).join("")||'<tr><td colspan="6">No customers yet.</td></tr>';
  document.getElementById("orderRows").innerHTML=orders.map(o=>`<tr><td>${safe(o.id)}</td><td>${safe(o.customer_id)}</td><td>₹${Number(o.total_amount||0)}</td><td>${safe(o.payment_method)}</td><td>${safe(o.status)}</td></tr>`).join("")||'<tr><td colspan="5">No orders yet.</td></tr>';
}
function openProductForm(){editingProductId=null;document.getElementById("productFormTitle").textContent="Add product";["pId","pTitle","pPrice","pQty","pDescription"].forEach(id=>document.getElementById(id).value="");document.getElementById("pId").disabled=false;document.getElementById("productForm").classList.remove("hidden")}
function closeProductForm(){document.getElementById("productForm").classList.add("hidden")}
function editProduct(id){const p=products.find(x=>x.id===id);if(!p)return;editingProductId=id;document.getElementById("productFormTitle").textContent="Edit product";document.getElementById("pId").value=p.id;document.getElementById("pId").disabled=true;document.getElementById("pTitle").value=p.title||"";document.getElementById("pCategory").value=p.cat_id||"";document.getElementById("pPrice").value=p.price||0;document.getElementById("pQty").value=p.qty||0;document.getElementById("pDescription").value=p.des||"";document.getElementById("productForm").classList.remove("hidden")}
async function saveProduct(){
  const id=document.getElementById("pId").value.trim(),data={title:document.getElementById("pTitle").value.trim(),cat_id:document.getElementById("pCategory").value,price:Number(document.getElementById("pPrice").value),qty:Number(document.getElementById("pQty").value),des:document.getElementById("pDescription").value.trim(),active:true};
  if(!id||!data.title||!data.cat_id||data.price<0||data.qty<0){toast("Complete the product fields with valid values");return}
  try{if(editingProductId)await patchDoc("products",editingProductId,data);else await createDoc("products",id,data);closeProductForm();await refreshAll();toast("Product saved")}
  catch(e){toast("Save failed: "+(e.response?.data?.error?.message||e.message))}
}
async function removeProduct(id){if(!confirm("Delete this product?"))return;try{await deleteDoc("products",id);await refreshAll();toast("Product deleted")}catch(e){toast("Delete failed: "+(e.response?.data?.error?.message||e.message))}}
async function addCategory(){const id=document.getElementById("newCategoryId").value.trim(),name=document.getElementById("newCategoryName").value.trim();if(!id||!name){toast("Enter category ID and name");return}try{await createDoc("categories",id,{name,active:true});document.getElementById("newCategoryId").value="";document.getElementById("newCategoryName").value="";await refreshAll();toast("Category added")}catch(e){toast("Category save failed: "+(e.response?.data?.error?.message||e.message))}}
async function removeCategory(id){if(!confirm("Delete this category?"))return;try{await deleteDoc("categories",id);await refreshAll();toast("Category deleted")}catch(e){toast("Delete failed: "+(e.response?.data?.error?.message||e.message))}}
async function init(){try{await refreshAll()}catch(e){console.error(e)}}
init();

// Start with the role chooser. Storefront and admin data remain hidden until login.
document.addEventListener("DOMContentLoaded", () => {
  currentRole = "";
  showView("entry");
});
