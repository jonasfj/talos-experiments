FROM          ubuntu:trusty
MAINTAINER    Jonas Finnemann Jensen <jopsen@gmail.com>

# Add utilities and configuration
ADD           run-datazilla.sh      /root/run-datazilla.sh
ADD           run-mysql.sh          /root/run-mysql.sh

# Install dependencies
RUN     DEBIAN_FRONTEND=noninteractive apt-get update \
    &&  apt-get upgrade -y \
    &&  apt-get install -y \
          rsyslog \
          ca-certificates \
          tar nano sudo screen vim wget curl nodejs rlwrap \
          git mercurial unzip zip build-essential \
          python-dev python-pip \
          libblas-dev liblapack-dev libatlas-base-dev gfortran \
          mysql-server libmysqlclient-dev \
          memcached \
    &&  rm -rf /var/lib/mysql/mysql \
    &&  apt-get clean
RUN     git clone https://github.com/mozilla/datazilla.git /root/datazilla \
    &&  cd /root/datazilla \
    &&  pip install -r requirements/compiled.txt \
    &&  cp datazilla/settings/local.sample.py datazilla/settings/local.py

USER          root
WORKDIR       /root/

EXPORT        9090

# Set entry point that will download input and launch display server
ENTRYPOINT    ["/root/run-datazilla.sh"]
