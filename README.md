# Funda detailpage + favorite list

## Inhoudsopgave

  * [Beschrijving](#beschrijving)
  * [Gebruik](#gebruik)
  * [Kenmerken](#kenmerken)
  * [Installatie](#installatie)
  * [Bronnen](#bronnen)
  * [Licentie](#licentie)

## Description
I have created a detail page and add to favorites flow, my main focus was to make the UX as smooth as possible and make the journey as pleasant as possible.

## Usage
as a user on funda i want to be able to add a house to any favorite list i have, this should be easy and smooth.

## Features
I have created this application with NodeJs, express, liquid, css and vanilla javascript. 

A few things i have kept in mind is:

- Progressive enhancement
- Pleasureable UI
- Make sure it is a clean UX
- All of the pages are build mobile first and responsive
- [WCAG](https://github.com/GijsNagtegaal/proof-of-concept/issues/10) and [performance](https://github.com/GijsNagtegaal/proof-of-concept/issues/27) tests

# Pages 

## Homes overview
<img width="1512" height="864" alt="Screenshot 2026-06-17 at 10 37 02" src="https://github.com/user-attachments/assets/ddfc4ffa-fa86-44c5-9292-d4bb4217bd7a" />

## House detail
<img width="1512" height="851" alt="Screenshot 2026-06-17 at 10 39 15" src="https://github.com/user-attachments/assets/e586a0ce-25aa-4d2a-85ba-184df1060f59" />
<img width="1189" height="679" alt="Screenshot 2026-06-17 at 10 39 31" src="https://github.com/user-attachments/assets/ec77cc94-872f-4b28-ba1a-3036b94594f0" />
<img width="1512" height="853" alt="Screenshot 2026-06-17 at 10 39 28" src="https://github.com/user-attachments/assets/c73f80cf-4d52-4acf-ae89-f53c7cfdfac6" />
<img width="1512" height="776" alt="Screenshot 2026-06-17 at 10 39 21" src="https://github.com/user-attachments/assets/59dd6b90-17cf-4653-a436-b0f6e6776ff2" />


Pleasurable UI

A nice skeleton loading state for images when they are not loaded yet:

https://github.com/user-attachments/assets/adc73d7a-45b3-4b56-be14-891ca6b2f520

The issue where its documented: 
https://github.com/GijsNagtegaal/proof-of-concept/issues/32

I have also created a view transition from image to image:


https://github.com/user-attachments/assets/750bf065-e65b-4527-bf2c-db4bbaec23b6


Progressive enhancement

For people who dont want animations i have created this media query: 
https://github.com/GijsNagtegaal/proof-of-concept/blob/e0a4fbc4ddbed24f4352bf439447b22369ca78b5/public/assets/styles/styleguide.css#L29-L85

when javascript is not available the phone link and descriptions are always fully shown becuase i use defensive javascript.

## Favorites overview
<img width="1512" height="660" alt="Screenshot 2026-06-17 at 10 40 33" src="https://github.com/user-attachments/assets/3ea8490b-835c-4326-b5b5-3772a282347b" />

## Favorites detail
<img width="1507" height="551" alt="Screenshot 2026-06-18 at 07 59 37" src="https://github.com/user-attachments/assets/7b5943d4-3b60-4b1b-ade3-fd9fbbb7a03d" />

## Manage favorites

https://github.com/user-attachments/assets/812c1161-212b-4f8d-b19a-78ab3c527670
<img width="1071" height="842" alt="Screenshot 2026-06-17 at 12 53 31" src="https://github.com/user-attachments/assets/c907dec5-d411-4156-84a8-96014da2624c" />

## add new favorite list
<img width="1512" height="435" alt="Screenshot 2026-06-17 at 12 59 01" src="https://github.com/user-attachments/assets/bfef014f-d6a2-4561-b255-d781767d8fea" />

# Components

## House card
<img width="370" height="399" alt="Screenshot 2026-06-17 at 10 37 44" src="https://github.com/user-attachments/assets/cee6a925-ca57-4c4a-b938-ace3f175e013" />

Loading state:

https://github.com/user-attachments/assets/bd140548-eb0e-40ee-85ff-cb73d7f8400e

## Favorite overview
<img width="1512" height="670" alt="Screenshot 2026-06-17 at 10 38 23" src="https://github.com/user-attachments/assets/a17ee7c5-4113-4128-8dd5-9bd8ceae5249" />

## Manage list
<img width="1512" height="755" alt="Screenshot 2026-06-17 at 10 38 43" src="https://github.com/user-attachments/assets/45e24c28-96f9-440f-9ce4-1f697c5bb81b" />

## Header
<img width="1512" height="64" alt="Screenshot 2026-06-17 at 10 36 48" src="https://github.com/user-attachments/assets/47eab1eb-5138-46d6-aedd-a43d406a215f" />

# Quick note

The view transitions and loading states and skeleton loading works on all pages

## Bronnen

## Licentie

This project is licensed under the terms of the [MIT license](./LICENSE).
