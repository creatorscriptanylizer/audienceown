import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BroadcastStudio } from "@/components/broadcast-studio/broadcast-studio";

const props={creator:{displayName:"Nana Kwame",publicSlug:"nanakwame"},accounts:[],accountsAvailable:true,estimate:null};
const render=(initialEntryIntent:"update"|"emergency")=>renderToStaticMarkup(<BroadcastStudio {...props} initialEntryIntent={initialEntryIntent}/>);

describe("canonical Create Update hub",()=>{
 it("renders Updates first with all seven canonical normal workflows",()=>{const html=render("update");expect(html.indexOf('id="share-heading"')).toBeLessThan(html.indexOf('id="protect-heading"'));for(const label of ["New video","Livestream","Podcast episode","Product release","Event","General announcement","Community update"])expect(html).toContain(label);expect(html).toContain("Normal communications");expect(html).toContain("Start a communication update")});
 it("renders a visually distinct Emergency Alerts section with exactly two entry cards",()=>{const html=render("emergency"),section=html.slice(html.indexOf('class="broadcast-choice-group is-protect'),html.indexOf('class="broadcast-choice-explainer'));for(const label of ["Emergency Alerts","Recovery communications","Account inaccessible","Platform migration","Mandatory Recovery Pass","Start a recovery communication"])expect(section).toContain(label);expect(section.match(/class="broadcast-choice-card/g)).toHaveLength(2)});
 it("uses entry intent only as one-time presentation context",()=>{const update=render("update"),emergency=render("emergency"),source=readFileSync("components/broadcast-studio/broadcast-studio.tsx","utf8");expect(update).toMatch(/is-share is-entry-target/);expect(emergency).toMatch(/is-protect is-entry-target/);expect(source).toContain("scrollIntoView");expect(source).toContain("useEffect(() => { focusSection(initialEntryIntent); }, [initialEntryIntent])");for(const forbidden of ["router.refresh","router.push","router.replace","location.reload",'fetch("/dashboard/updates/new'])expect(source).not.toContain(forbidden)});
 it("keeps real creator identity and the approved explainer",()=>{const html=render("update");for(const value of ["Publishing as","Nana Kwame","@nanakwame","Not sure which to choose?","Updates are for sharing content. Emergency Alerts are for account or platform problems."])expect(html).toContain(value)});
});
