alter type public.delivery_status rename value 'sent' to 'accepted';
alter type public.delivery_status add value if not exists 'bounced' after 'delivered';
alter type public.delivery_status add value if not exists 'complained' after 'bounced';
