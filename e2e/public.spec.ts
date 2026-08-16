import { test,expect } from "@playwright/test";
test("landing page has working account routes",async({page})=>{await page.goto("/");await expect(page.getByRole("heading",{name:/Your reach can disappear/})).toBeVisible();await page.getByRole("link",{name:"Claim your page"}).first().click();await expect(page).toHaveURL(/signup/);await expect(page.getByRole("button",{name:"Create account"})).toBeVisible()});
test("unknown creator has an honest not-found state",async({page})=>{await page.goto("/this_creator_should_not_exist");await expect(page.getByRole("heading",{name:"This creator page isn’t live."})).toBeVisible()});
test("data deletion instructions are public and canonical",async({page})=>{
  const response=await page.goto("/data-deletion");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/data-deletion$/);
  await expect(page.getByRole("heading",{level:1,name:"Data Deletion"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Facebook and Meta data"})).toBeVisible();
  await expect(page.getByRole("link",{name:"contact@audienceown.com"}).first()).toHaveAttribute("href","mailto:contact@audienceown.com");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href","https://audienceown.com/data-deletion");
  await expect(page.locator("footer").getByRole("link",{name:"Data Deletion Policy"})).toHaveAttribute("href","/data-deletion");
});
test("privacy policy publishes only operational contact mailboxes",async({page})=>{
  const response=await page.goto("/privacy");
  expect(response?.status()).toBe(200);
  await expect(page.getByText("Last updated: August 15, 2026")).toBeVisible();
  await expect(page.getByRole("link",{name:"contact@audienceown.com"}).first()).toHaveAttribute("href","mailto:contact@audienceown.com");
  await expect(page.getByRole("link",{name:"support@audienceown.com"}).first()).toHaveAttribute("href","mailto:support@audienceown.com");
  await expect(page.locator("body")).not.toContainText("privacy@audienceown.com");
  await expect(page.locator("body")).not.toContainText("developers@audienceown.com");
});
test("contact form is accessible and responsive",async({page})=>{
  for(const viewport of [{width:1280,height:900},{width:768,height:900},{width:390,height:844}]){
    await page.setViewportSize(viewport);
    await page.goto("/contact");
    await expect(page.getByRole("heading",{level:1,name:"How can we help?"})).toBeVisible();
    await expect(page.getByRole("combobox",{name:"Topic"})).toBeVisible();
    for(const label of ["Name","Email","AudienceOwn handle — optional","Subject"]){await expect(page.getByRole("textbox",{name:label,exact:true})).toBeVisible();} await expect(page.locator("textarea[name=message]")).toBeVisible();
    await expect(page.getByRole("link",{name:"support@audienceown.com"}).first()).toHaveAttribute("href","mailto:support@audienceown.com");
    await expect(page.getByRole("link",{name:"contact@audienceown.com"}).first()).toHaveAttribute("href","mailto:contact@audienceown.com");
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  }
});
test("contact intake reveals relevant context and manages screenshots",async({page})=>{
  await page.goto("/contact");
  const topic=page.getByRole("combobox",{name:"Topic"});
  await topic.selectOption("platforms_connected_accounts");
  await expect(page.getByRole("combobox",{name:"Platform"})).toBeVisible();
  await topic.selectOption("privacy_request");
  await expect(page.getByRole("combobox",{name:"Issue type"})).toBeVisible();
  await expect(page.getByText(/verify your identity/)).toBeVisible();
  await topic.selectOption("security_abuse");
  await expect(page.getByText(/Do not include passwords/)).toBeVisible();
  await topic.selectOption("account_sign_in");
  await expect(page.getByRole("combobox",{name:"How urgent is this?"})).toBeVisible();
  await topic.selectOption("other");
  await expect(page.getByRole("combobox",{name:"Issue type"})).toHaveCount(0);
  const input=page.locator('input[type="file"]');
  await input.setInputFiles({name:"screen.png",mimeType:"image/png",buffer:Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])});
  await expect(page.getByText("screen.png")).toBeVisible();
  await page.getByRole("button",{name:"Remove screen.png"}).click();
  await expect(page.getByText("screen.png")).toHaveCount(0);
});
test("support and privacy cards use Contact with safe topic preselection",async({page})=>{
  await page.goto("/trust");
  const help=page.locator('section[aria-labelledby="help-heading"]');
  await help.getByRole("link",{name:/Support support@audienceown.com/}).click();
  await expect(page).toHaveURL(/\/contact\?topic=account_sign_in$/);
  await expect(page.getByRole("combobox",{name:"Topic"})).toHaveValue("account_sign_in");
  await page.goto("/trust");
  await help.getByRole("link",{name:/Privacy contact@audienceown.com/}).click();
  await expect(page).toHaveURL(/\/contact\?topic=privacy_request$/);
  await expect(page.getByRole("combobox",{name:"Topic"})).toHaveValue("privacy_request");
  await page.goto("/contact?topic=not-a-real-topic");
  await expect(page.getByRole("combobox",{name:"Topic"})).toHaveValue("");
});
test("contact form announces validation and mocked success",async({page})=>{
  let submissions=0; await page.route("**/api/contact",route=>{submissions+=1; return route.fulfill({status:submissions===1?400:200,contentType:"application/json",body:JSON.stringify(submissions===1?{status:"invalid",errors:{topic:"Choose a topic."}}:{status:"success"})});});
  await page.goto("/contact"); await page.getByRole("button",{name:"Send message"}).click(); await expect(page.getByText("Choose a topic.")).toBeVisible();
  await page.getByRole("combobox",{name:"Topic"}).selectOption("other");
  await page.getByRole("textbox",{name:"Name",exact:true}).fill("Nana"); await page.getByRole("textbox",{name:"Email",exact:true}).fill("nana@example.com"); await page.getByRole("textbox",{name:"Subject",exact:true}).fill("Question"); await page.locator("textarea[name=message]").fill("Please help.");
  await page.getByRole("button",{name:"Send message"}).click(); await expect(page.getByRole("status")).toContainText("Message sent");
});
