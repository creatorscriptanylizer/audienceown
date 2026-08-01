# Feed security

Feed URLs require HTTPS. DNS answers are checked against private, loopback, link-local, carrier-grade NAT, multicast, and metadata ranges. Redirects are manual and bounded, every hop is revalidated, response bodies and time are bounded, content types are constrained, and DTDs, entities, and XML stylesheets are rejected. Item descriptions never trigger remote fetches.
