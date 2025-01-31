import scheduler from "adonisjs-scheduler/services/main";

scheduler.command("synchronize:parkings").everyMinute();
