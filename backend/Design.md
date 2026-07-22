# LinkShift Backend Design Summary

## Goal

Build a URL Shortener + QR Generator where a user can: - Create only a
short link. - Create a short link and one or more QR codes. - View
analytics for every visit.

## Why a separate Link model?

Originally the target URL was inside the QR model. We changed this
because QR generation is optional. A user may only want a shortened URL.
Therefore, Link became the central entity.

Relationship: - User -\> Many Links - Link -\> Many QRs - Link -\> Many
Scans

## Why Link -> Many QR?

We initially considered Link -\> 0..1 QR. We changed it to Link -\> Many
QR to support: - Multiple QR designs for the same link. - Different
colors. - Different logos. - Future premium features. - Future
editing/customization.

The frontend can still create only one QR initially while the database
remains future-proof.

## Why scans belong to Link?

Analytics should count every visit whether the user scans the QR or
opens the shortened URL directly.

## QR customization fields

-   foregroundColor
-   backgroundColor
-   logoUrl
-   pattern
-   eyeStyle
-   eyeBallStyle
-   margin

Store only the image URL/path in the database, not the image itself.

## Current Models

User: - id - name - email - password - createdAt - updatedAt

Link: - id - userId - name (optional) - targetUrl - shortId (unique) -
isActive - createdAt - updatedAt

Qr: - id - linkId - foregroundColor - backgroundColor - logoUrl -
pattern - eyeStyle - eyeBallStyle - margin - createdAt - updatedAt

Scan: - id - linkId - device - browser - os - country - city -
ipAddress - scannedAt

## Future Business Plan

Free and premium plans can later limit: - Number of links - Number of QR
codes - Advanced customization - Analytics

## Design Principles

-   Link is the primary entity.
-   QR is optional.
-   Analytics belong to Link.
-   Store file URLs instead of images.
-   Keep the MVP simple while allowing future expansion.
