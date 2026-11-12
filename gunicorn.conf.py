import os

# Heroku sets PORT.
bind = f"0.0.0.0:{os.environ.get('PORT', '8000')}"
# Workers come from WEB_CONCURRENCY, default 1.
threads = 4
# No access log, so visitor IPs aren't recorded.
accesslog = None
# The image runs with a read-only root filesystem.
worker_tmp_dir = "/dev/shm" if os.path.isdir("/dev/shm") else None
control_socket_disable = True
