---
layout: layouts/feed.html
pagination:
  data: collections.tagList
  size: 1
  alias: tag
permalink: "/tag/{{ tag | slugify }}/index.html"
title: "Tag Archive"
---

{% set collectionKey = tag %}