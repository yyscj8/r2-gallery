# Cutie Gallery

A high-performance private media gallery web application backed by Cloudflare Pages, Workers, D1, and R2.

## Language

**Pass**:
The persistent identity and entitlement entity created upon first activation, holding the subscription expiration timestamp, active device sessions, and personal bookmarks.
_Avoid_: User account, profile, member

**Access Code**:
A single-use 30-day card key purchased from Mianbaoduo, used either to activate a new Pass or to extend the subscription period of an existing Pass by 30 days.
_Avoid_: Password, registration key, coupon, activation token

**Subscription Period**:
The rolling 30-day validity window of a Pass; expired passes lose media access but retain their Bookmarks permanently until renewed.
_Avoid_: VIP level, member term, expiration date

**Device Session**:
An authenticated browser instance bound to a Pass via an HttpOnly cookie, strictly capped at 2 concurrent active devices.
_Avoid_: Token, login session, user device

**Creator**:
The handle or channel name of the original content creator; the single primary classification axis for media in the gallery.
_Avoid_: Category, tag, author, platform

**Media Asset**:
A single archived image or video item belonging to a Creator.
_Avoid_: Post, file, item, download

**Poster**:
A pre-generated static WebP thumbnail representing the initial frame of a video, used in gallery feeds to prevent mobile browser memory exhaustion.
_Avoid_: Thumbnail, preview, video poster

**Bookmark**:
A Media Asset explicitly marked by an end-user into their personal favorites list, preserved indefinitely across subscription renewals.
_Avoid_: Favorite, like, star, category收藏
