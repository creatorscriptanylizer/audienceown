export async function copyRecoveryPassLink(url:string) {
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    const node=document.createElement("textarea");
    node.value=url;
    document.body.append(node);
    node.select();
    document.execCommand("copy");
    node.remove();
  }
}

export async function shareRecoveryPassLink(url:string) {
  if(navigator.share) {
    try {
      await navigator.share({title:"My AudienceOwn Recovery Pass",url});
      return "shared" as const;
    } catch {}
  }
  await copyRecoveryPassLink(url);
  return "copied" as const;
}
