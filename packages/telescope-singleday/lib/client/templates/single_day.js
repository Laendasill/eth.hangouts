// see https://www.discovermeteor.com/blog/template-level-subscriptions/

// this template acts as the controller that sets and 
// manages the reactive context for the embedded postsList template

Template[getTemplate('singleDay')].created = function () {

  // 1. Initialization

  var instance = this;

  // initialize the reactive variables
  instance.postsLoaded = new ReactiveVar(0);
  instance.postsLimit = new ReactiveVar(getSetting('postsPerPage', 10));
  instance.postsReady = new ReactiveVar(false);

  instance.getTerms = function () {
    var currentDate = Session.get('currentDate');
    return {
      view: 'digest',
      after: moment(currentDate).startOf('day').toDate(),
      before: moment(currentDate).endOf('day').toDate(),
      limit: instance.postsLimit
    }
  };

  // 2. Autorun

  // will re-run when the "postsLimit" reactive variables changes
  instance.autorun(function () {

    var terms = instance.getTerms();

    // get the postsLimit
    terms.limit = instance.postsLimit.get();

    console.log("Asking for " + terms.limit + " posts…")

    // subscribe
    var postsSubscription = Meteor.subscribe('postsList', terms);
    var usersSubscription = Meteor.subscribe('postsListUsers', terms);

    // if subscriptions are ready, set limit to newLimit
    if (postsSubscription.ready() && usersSubscription.ready()) {
      console.log("> Received "+terms.limit+" posts. \n\n")
      instance.postsLoaded.set(terms.limit);
      instance.postsReady.set(true);
    } else {
      instance.postsReady.set(false);
      console.log("> Subscription is not ready yet. \n\n");
    }
  });

  // 3. Cursor

  instance.getPostsCursor = function() {
    var termsLoaded = _.extend(instance.getTerms(), {limit: instance.postsLoaded.get()});
    var parameters = getPostsParameters(termsLoaded);
    return Posts.find(parameters.find, parameters.options);
  }

}

Template[getTemplate('singleDay')].helpers({
  singleDayNav: function () {
    return getTemplate('singleDayNav');
  },
  posts_list: function () {
    return getTemplate('posts_list');
  },
  context: function () {
    // create context for postsList module
    var instance = Template.instance();
    var postsCursor = instance.getPostsCursor();

    var context = {

      // posts cursor
      postsCursor: postsCursor,

      // posts subscription readiness, used to show spinner
      postsReady: instance.postsReady.get(),

      // whether to show the load more button or not
      hasMorePosts: postsCursor.count() >= instance.postsLimit.get(),

      // what to do when user clicks "load more"
      loadMoreHandler: function (event, instance) {
        event.preventDefault();

        // get current value for limit, i.e. how many posts are currently displayed
        var limit = instance.postsLimit.get();
        // increase limit by 5 and update it
        limit += getSetting('postsPerPage', 10);
        instance.postsLimit.set(limit);
      },

      // the current instance
      controllerInstance: instance

    }

    return context;
  }
});