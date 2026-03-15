---
title: "Tags"
permalink: "/tags/index.html"
---

{% extends "layouts/base.html" %}

{% block content %}
<article class="[ wrapper ] [ flow flow-space-700 ]">
	<header class="[ flow flow-space-300 ]">
		<h1>{{ title }}</h1>
		<p>Browse content by topic.</p>
	</header>

	<ul class="tag-list">
		{% for tag in collections.tagList %}
			<li>
				<a href="/tag/{{ tag | slugify }}/">
					{{ tag }} ({{ collections[tag] | length }})
				</a>
			</li>
		{% endfor %}
	</ul>
</article>
{% endblock %}